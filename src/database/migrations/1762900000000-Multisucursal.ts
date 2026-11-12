import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Multisucursal (fases 1-4 + tablas de la fase 5).
 *
 * Qué hace (up):
 *  1. Crea `sucursal` y `usuario_sucursal`.
 *  2. Inserta la sucursal "Casa Central" (`CASA-CENTRAL`) y le asigna TODOS los usuarios no borrados.
 *  3. Agrega `sucursal_id` (nullable) a stock, movimiento_stock, venta, compra y caja,
 *     lo rellena con Casa Central y luego lo pasa a NOT NULL con índice + FK a `sucursal`.
 *  4. Stock pasa de único por producto a único por (producto, sucursal): `uq_stock_producto_sucursal`.
 *  5. Venta guarda un snapshot de la sucursal (nombre / dirección / teléfono).
 *  6. Caja: columna generada `abierta_lock` + UNIQUE => una sola caja ABIERTA por sucursal.
 *  7. Amplía los ENUM de movimiento_stock (TRANSFERENCIA_*).
 *  8. Crea `transferencia`, `item_transferencia` y `transferencia_numeracion` (singleton global)
 *     para la fase 5 (todavía sin lógica en la API).
 *
 * Numeración de venta/compra/caja/transferencia: GLOBAL (contadores `*_numeracion` sin cambios).
 *
 * IMPORTANTE (orden en `stock`): el FK `FK_dafa790e6b13a93401ca6042f01` (stock.producto_id → producto.id)
 * usa como índice de soporte el UNIQUE `REL_dafa790e6b13a93401ca6042f0` (producto_id) del InitialSchema.
 * MySQL NO deja borrar ese índice mientras sea el único que respalda el FK (error 1553). Por eso primero
 * se CREA `uq_stock_producto_sucursal (producto_id, sucursal_id)` —cuyo prefijo `producto_id` sirve de soporte
 * al FK— y recién después se elimina el UNIQUE viejo.
 *
 * Nombre del UNIQUE viejo: `REL_dafa790e6b13a93401ca6042f0` (ver InitialSchema, CREATE TABLE stock).
 * Como TypeORM/MySQL pudieron haberlo nombrado distinto en una DB creada por otra vía, el `up` lo busca
 * dinámicamente. Consulta equivalente para verificarlo a mano:
 *
 *   SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columnas, NON_UNIQUE
 *   FROM information_schema.STATISTICS
 *   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock'
 *   GROUP BY INDEX_NAME, NON_UNIQUE;
 *
 * ⚠️ Probar siempre sobre una COPIA de la base (ver docs/multisucursal.md). En MySQL el DDL hace commit
 * implícito: si falla a mitad de camino NO hay rollback automático; restaurar el backup.
 */
export class Multisucursal1762900000000 implements MigrationInterface {
  name = 'Multisucursal1762900000000';

  /** Tablas operativas que pasan a pertenecer a una sucursal. */
  private static readonly TABLAS_CON_SUCURSAL = [
    'stock',
    'movimiento_stock',
    'venta',
    'compra',
    'caja',
  ] as const;

  private static readonly CASA_CENTRAL_CODIGO = 'CASA-CENTRAL';
  private static readonly UNIQUE_STOCK_VIEJO = 'REL_dafa790e6b13a93401ca6042f0';
  private static readonly UNIQUE_STOCK_NUEVO = 'uq_stock_producto_sucursal';
  private static readonly UNIQUE_CAJA_ABIERTA = 'uq_caja_abierta_por_sucursal';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. sucursal -----------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sucursal (
        id int NOT NULL AUTO_INCREMENT,
        created_date datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_date datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_date datetime(6) NULL,
        nombre varchar(120) NOT NULL,
        codigo varchar(40) NOT NULL,
        direccion varchar(255) NULL,
        telefono varchar(40) NULL,
        activo tinyint NOT NULL DEFAULT 1,
        UNIQUE INDEX uq_sucursal_codigo (codigo),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    // 2. usuario_sucursal ---------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS usuario_sucursal (
        id int NOT NULL AUTO_INCREMENT,
        usuario_id int NOT NULL,
        sucursal_id int NOT NULL,
        created_date datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE INDEX UQ_usuario_sucursal_usuario_sucursal (usuario_id, sucursal_id),
        INDEX IDX_usuario_sucursal_sucursal (sucursal_id),
        PRIMARY KEY (id),
        CONSTRAINT FK_usuario_sucursal_usuario FOREIGN KEY (usuario_id)
          REFERENCES usuario (id) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT FK_usuario_sucursal_sucursal FOREIGN KEY (sucursal_id)
          REFERENCES sucursal (id) ON DELETE NO ACTION ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    // 3. Casa Central (dirección/teléfono tomados de la config de ticket si existe) -------------
    await queryRunner.query(
      `
      INSERT INTO sucursal (nombre, codigo, direccion, telefono, activo)
      SELECT 'Casa Central', ?, NULLIF(TRIM(t.direccion), ''), NULLIF(TRIM(t.telefono), ''), 1
      FROM (SELECT 1 AS uno) AS base
      LEFT JOIN (SELECT direccion, telefono FROM ticket ORDER BY id ASC LIMIT 1) AS t ON 1 = 1
      WHERE NOT EXISTS (SELECT 1 FROM sucursal WHERE codigo = ?)
      `,
      [Multisucursal1762900000000.CASA_CENTRAL_CODIGO, Multisucursal1762900000000.CASA_CENTRAL_CODIGO],
    );
    const casaCentralId = await this.getCasaCentralId(queryRunner);

    // 4. Todos los usuarios no borrados -> Casa Central ---------------------------------------
    await queryRunner.query(
      `
      INSERT IGNORE INTO usuario_sucursal (usuario_id, sucursal_id)
      SELECT u.id, ? FROM usuario u WHERE u.deleted_date IS NULL
      `,
      [casaCentralId],
    );

    // 5. sucursal_id nullable ------------------------------------------------------------------
    for (const tabla of Multisucursal1762900000000.TABLAS_CON_SUCURSAL) {
      if (!(await this.hasColumn(queryRunner, tabla, 'sucursal_id'))) {
        await queryRunner.query(`ALTER TABLE ${tabla} ADD sucursal_id int NULL`);
      }
    }

    // 6. Backfill con Casa Central (incluye filas soft-deleted) -------------------------------
    for (const tabla of Multisucursal1762900000000.TABLAS_CON_SUCURSAL) {
      await queryRunner.query(
        `UPDATE ${tabla} SET sucursal_id = ? WHERE sucursal_id IS NULL`,
        [casaCentralId],
      );
    }

    // 7. stock: UNIQUE (producto_id, sucursal_id) y baja del UNIQUE por producto ---------------
    //    Orden obligatorio: crear el nuevo ANTES de borrar el viejo (ver nota de la clase).
    if (
      !(await this.hasIndex(
        queryRunner,
        'stock',
        Multisucursal1762900000000.UNIQUE_STOCK_NUEVO,
      ))
    ) {
      await queryRunner.query(
        `ALTER TABLE stock ADD UNIQUE INDEX ${Multisucursal1762900000000.UNIQUE_STOCK_NUEVO} (producto_id, sucursal_id)`,
      );
    }
    for (const indexName of await this.findUniqueStockPorProducto(queryRunner)) {
      await queryRunner.query(`DROP INDEX \`${indexName}\` ON stock`);
    }

    // 8. NOT NULL + índice + FK a sucursal ----------------------------------------------------
    for (const tabla of Multisucursal1762900000000.TABLAS_CON_SUCURSAL) {
      await queryRunner.query(
        `ALTER TABLE ${tabla} MODIFY sucursal_id int NOT NULL`,
      );
      if (!(await this.hasIndex(queryRunner, tabla, `idx_${tabla}_sucursal`))) {
        await queryRunner.query(
          `CREATE INDEX idx_${tabla}_sucursal ON ${tabla} (sucursal_id)`,
        );
      }
      if (!(await this.hasForeignKey(queryRunner, tabla, `FK_${tabla}_sucursal`))) {
        await queryRunner.query(`
          ALTER TABLE ${tabla}
          ADD CONSTRAINT FK_${tabla}_sucursal FOREIGN KEY (sucursal_id)
          REFERENCES sucursal (id) ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
      }
    }

    // 9. Snapshot de sucursal en venta --------------------------------------------------------
    if (!(await this.hasColumn(queryRunner, 'venta', 'sucursal_nombre'))) {
      await queryRunner.query(`
        ALTER TABLE venta
        ADD sucursal_nombre varchar(120) NOT NULL DEFAULT '',
        ADD sucursal_direccion varchar(255) NULL,
        ADD sucursal_telefono varchar(40) NULL
      `);
    }
    await queryRunner.query(`
      UPDATE venta v
      INNER JOIN sucursal s ON s.id = v.sucursal_id
      SET v.sucursal_nombre = s.nombre,
          v.sucursal_direccion = s.direccion,
          v.sucursal_telefono = s.telefono
      WHERE v.sucursal_nombre = ''
    `);

    // 10. Una sola caja ABIERTA por sucursal --------------------------------------------------
    const duplicadas: { sucursal_id: number; n: string | number }[] =
      await queryRunner.query(`
        SELECT sucursal_id, COUNT(*) AS n
        FROM caja
        WHERE estado = 'ABIERTA'
        GROUP BY sucursal_id
        HAVING COUNT(*) > 1
      `);
    if (duplicadas.length > 0) {
      throw new Error(
        `Multisucursal: hay más de una caja ABIERTA en la misma sucursal (${JSON.stringify(duplicadas)}). ` +
          'Cerrá las cajas sobrantes antes de migrar.',
      );
    }
    if (!(await this.hasColumn(queryRunner, 'caja', 'abierta_lock'))) {
      await queryRunner.query(`
        ALTER TABLE caja
        ADD abierta_lock int GENERATED ALWAYS AS
          (CASE WHEN estado = 'ABIERTA' THEN sucursal_id ELSE NULL END) STORED NULL
      `);
    }
    if (
      !(await this.hasIndex(
        queryRunner,
        'caja',
        Multisucursal1762900000000.UNIQUE_CAJA_ABIERTA,
      ))
    ) {
      await queryRunner.query(
        `CREATE UNIQUE INDEX ${Multisucursal1762900000000.UNIQUE_CAJA_ABIERTA} ON caja (abierta_lock)`,
      );
    }

    // 11. ENUM movimiento_stock.tipo ----------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE movimiento_stock
      MODIFY tipo enum ('COMPRA', 'VENTA', 'AJUSTE_ENTRADA', 'AJUSTE_SALIDA', 'TRANSFERENCIA_ENTRADA', 'TRANSFERENCIA_SALIDA') NOT NULL
    `);

    // 12. ENUM movimiento_stock.tipo_referencia -----------------------------------------------
    await queryRunner.query(`
      ALTER TABLE movimiento_stock
      MODIFY tipo_referencia enum ('AJUSTE', 'COMPRA', 'VENTA', 'OTRO', 'TRANSFERENCIA') NOT NULL
    `);

    // 13. Tablas de transferencias (fase 5) ---------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS transferencia (
        id int NOT NULL AUTO_INCREMENT,
        created_date datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_date datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_date datetime(6) NULL,
        numero int UNSIGNED NULL,
        estado enum ('BORRADOR', 'CONFIRMADA', 'CANCELADA') NOT NULL DEFAULT 'BORRADOR',
        sucursal_origen_id int NOT NULL,
        sucursal_destino_id int NOT NULL,
        usuario_id int NOT NULL,
        observacion varchar(500) NULL,
        UNIQUE INDEX uq_transferencia_numero (numero),
        INDEX idx_transferencia_sucursal_origen (sucursal_origen_id),
        INDEX idx_transferencia_sucursal_destino (sucursal_destino_id),
        PRIMARY KEY (id),
        CONSTRAINT FK_transferencia_sucursal_origen FOREIGN KEY (sucursal_origen_id)
          REFERENCES sucursal (id) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT FK_transferencia_sucursal_destino FOREIGN KEY (sucursal_destino_id)
          REFERENCES sucursal (id) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT FK_transferencia_usuario FOREIGN KEY (usuario_id)
          REFERENCES usuario (id) ON DELETE NO ACTION ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS item_transferencia (
        id int NOT NULL AUTO_INCREMENT,
        created_date datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_date datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_date datetime(6) NULL,
        transferencia_id int NOT NULL,
        producto_id int NOT NULL,
        cantidad int NOT NULL,
        INDEX idx_item_transferencia_transferencia (transferencia_id),
        INDEX idx_item_transferencia_producto (producto_id),
        PRIMARY KEY (id),
        CONSTRAINT FK_item_transferencia_transferencia FOREIGN KEY (transferencia_id)
          REFERENCES transferencia (id) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT FK_item_transferencia_producto FOREIGN KEY (producto_id)
          REFERENCES producto (id) ON DELETE NO ACTION ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS transferencia_numeracion (
        id int NOT NULL,
        ultimo_numero int UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);
    // Singleton GLOBAL (id = 1), igual que venta/compra/caja_numeracion.
    await queryRunner.query(`
      INSERT INTO transferencia_numeracion (id, ultimo_numero)
      VALUES (1, 0)
      ON DUPLICATE KEY UPDATE id = id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Verificaciones previas: si revertir destruiría datos, se aborta SIN tocar nada. -----------
    const movimientosTransferencia: { n: string | number }[] =
      await queryRunner.query(`
        SELECT COUNT(*) AS n
        FROM movimiento_stock
        WHERE tipo IN ('TRANSFERENCIA_ENTRADA', 'TRANSFERENCIA_SALIDA')
           OR tipo_referencia = 'TRANSFERENCIA'
      `);
    if (Number(movimientosTransferencia[0]?.n ?? 0) > 0) {
      throw new Error(
        'Multisucursal.down abortada: existen movimientos_stock de transferencias ' +
          '(TRANSFERENCIA_ENTRADA/SALIDA). Revertir el ENUM los corrompería.',
      );
    }

    const stockMultiple: { n: string | number }[] = await queryRunner.query(`
      SELECT COUNT(*) AS n FROM (
        SELECT producto_id FROM stock GROUP BY producto_id HAVING COUNT(*) > 1
      ) AS duplicados
    `);
    if (Number(stockMultiple[0]?.n ?? 0) > 0) {
      throw new Error(
        'Multisucursal.down abortada: hay productos con stock en más de una sucursal y el ' +
          'esquema anterior exige UNIQUE(producto_id). Consolidá o eliminá el stock de las ' +
          'sucursales adicionales antes de revertir.',
      );
    }

    // 13. transferencias (orden inverso al de creación) ---------------------------------------
    await queryRunner.query(`DROP TABLE IF EXISTS item_transferencia`);
    await queryRunner.query(`DROP TABLE IF EXISTS transferencia`);
    await queryRunner.query(`DROP TABLE IF EXISTS transferencia_numeracion`);

    // 12-11. ENUM originales ------------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE movimiento_stock
      MODIFY tipo_referencia enum ('AJUSTE', 'COMPRA', 'VENTA', 'OTRO') NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE movimiento_stock
      MODIFY tipo enum ('COMPRA', 'VENTA', 'AJUSTE_ENTRADA', 'AJUSTE_SALIDA') NOT NULL
    `);

    // 10. caja abierta_lock -------------------------------------------------------------------
    if (
      await this.hasIndex(
        queryRunner,
        'caja',
        Multisucursal1762900000000.UNIQUE_CAJA_ABIERTA,
      )
    ) {
      await queryRunner.query(
        `DROP INDEX ${Multisucursal1762900000000.UNIQUE_CAJA_ABIERTA} ON caja`,
      );
    }
    if (await this.hasColumn(queryRunner, 'caja', 'abierta_lock')) {
      await queryRunner.query(`ALTER TABLE caja DROP COLUMN abierta_lock`);
    }

    // 9. snapshot de venta --------------------------------------------------------------------
    if (await this.hasColumn(queryRunner, 'venta', 'sucursal_nombre')) {
      await queryRunner.query(`
        ALTER TABLE venta
        DROP COLUMN sucursal_telefono,
        DROP COLUMN sucursal_direccion,
        DROP COLUMN sucursal_nombre
      `);
    }

    // 7. stock: volver al UNIQUE por producto ANTES de soltar el compuesto --------------------
    if (
      !(await this.hasIndex(
        queryRunner,
        'stock',
        Multisucursal1762900000000.UNIQUE_STOCK_VIEJO,
      ))
    ) {
      await queryRunner.query(
        `ALTER TABLE stock ADD UNIQUE INDEX ${Multisucursal1762900000000.UNIQUE_STOCK_VIEJO} (producto_id)`,
      );
    }
    if (
      await this.hasIndex(
        queryRunner,
        'stock',
        Multisucursal1762900000000.UNIQUE_STOCK_NUEVO,
      )
    ) {
      await queryRunner.query(
        `DROP INDEX ${Multisucursal1762900000000.UNIQUE_STOCK_NUEVO} ON stock`,
      );
    }

    // 8-5. FK + índice + columna sucursal_id (orden inverso) ----------------------------------
    for (const tabla of [
      ...Multisucursal1762900000000.TABLAS_CON_SUCURSAL,
    ].reverse()) {
      if (await this.hasForeignKey(queryRunner, tabla, `FK_${tabla}_sucursal`)) {
        await queryRunner.query(
          `ALTER TABLE ${tabla} DROP FOREIGN KEY FK_${tabla}_sucursal`,
        );
      }
      if (await this.hasIndex(queryRunner, tabla, `idx_${tabla}_sucursal`)) {
        await queryRunner.query(
          `DROP INDEX idx_${tabla}_sucursal ON ${tabla}`,
        );
      }
      if (await this.hasColumn(queryRunner, tabla, 'sucursal_id')) {
        await queryRunner.query(`ALTER TABLE ${tabla} DROP COLUMN sucursal_id`);
      }
    }

    // 1-4. usuario_sucursal y sucursal --------------------------------------------------------
    await queryRunner.query(`DROP TABLE IF EXISTS usuario_sucursal`);
    await queryRunner.query(`DROP TABLE IF EXISTS sucursal`);
  }

  private async getCasaCentralId(queryRunner: QueryRunner): Promise<number> {
    const rows: { id: number }[] = await queryRunner.query(
      `SELECT id FROM sucursal WHERE codigo = ? LIMIT 1`,
      [Multisucursal1762900000000.CASA_CENTRAL_CODIGO],
    );
    if (!rows.length) {
      throw new Error('Multisucursal: no se pudo crear/encontrar Casa Central');
    }
    return Number(rows[0].id);
  }

  /**
   * UNIQUE de un solo campo (`producto_id`) sobre `stock` distintos del nuevo compuesto.
   * Esperado: `REL_dafa790e6b13a93401ca6042f0`.
   */
  private async findUniqueStockPorProducto(
    queryRunner: QueryRunner,
  ): Promise<string[]> {
    const rows: { name: string }[] = await queryRunner.query(
      `
      SELECT s.INDEX_NAME AS name
      FROM information_schema.STATISTICS s
      WHERE s.TABLE_SCHEMA = DATABASE()
        AND s.TABLE_NAME = 'stock'
        AND s.NON_UNIQUE = 0
        AND s.INDEX_NAME NOT IN ('PRIMARY', ?)
      GROUP BY s.INDEX_NAME
      HAVING COUNT(*) = 1 AND MAX(s.COLUMN_NAME) = 'producto_id'
      `,
      [Multisucursal1762900000000.UNIQUE_STOCK_NUEVO],
    );
    return rows.map((r) => r.name);
  }

  private async hasColumn(
    queryRunner: QueryRunner,
    tabla: string,
    columna: string,
  ): Promise<boolean> {
    const rows: { n: string | number }[] = await queryRunner.query(
      `
      SELECT COUNT(*) AS n FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
      `,
      [tabla, columna],
    );
    return Number(rows[0]?.n ?? 0) > 0;
  }

  private async hasIndex(
    queryRunner: QueryRunner,
    tabla: string,
    indexName: string,
  ): Promise<boolean> {
    const rows: { n: string | number }[] = await queryRunner.query(
      `
      SELECT COUNT(*) AS n FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?
      `,
      [tabla, indexName],
    );
    return Number(rows[0]?.n ?? 0) > 0;
  }

  private async hasForeignKey(
    queryRunner: QueryRunner,
    tabla: string,
    constraintName: string,
  ): Promise<boolean> {
    const rows: { n: string | number }[] = await queryRunner.query(
      `
      SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'
      `,
      [tabla, constraintName],
    );
    return Number(rows[0]?.n ?? 0) > 0;
  }
}
