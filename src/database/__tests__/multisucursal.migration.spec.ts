import { describe, expect, it } from 'vitest';
import { Multisucursal1762900000000 } from '../migrations/1762900000000-Multisucursal.js';

/**
 * Prueba de la migración con un QueryRunner FALSO: NO toca ninguna base de datos.
 * Verifica el orden de las sentencias críticas (ver comentarios de la migración).
 */
function fakeQueryRunner(options: {
  stockUniqueViejo?: string[];
  existing?: Set<string>;
  stockDuplicado?: number;
  movimientosTransferencia?: number;
  cajasDuplicadas?: unknown[];
}) {
  const sqls: string[] = [];
  const existing = options.existing ?? new Set<string>();

  const queryRunner: any = {
    query: async (sql: string, params: unknown[] = []) => {
      const text = sql.replace(/\s+/g, ' ').trim();
      sqls.push(text);

      if (text.includes('FROM sucursal WHERE codigo = ?')) return [{ id: 1 }];
      if (text.includes('FROM information_schema.STATISTICS s'))
        return (options.stockUniqueViejo ?? []).map((name) => ({ name }));
      if (text.includes('information_schema.COLUMNS'))
        return [{ n: existing.has(`col:${params[0]}.${params[1]}`) ? 1 : 0 }];
      if (text.includes('information_schema.STATISTICS'))
        return [{ n: existing.has(`idx:${params[0]}.${params[1]}`) ? 1 : 0 }];
      if (text.includes('information_schema.TABLE_CONSTRAINTS'))
        return [{ n: existing.has(`fk:${params[0]}.${params[1]}`) ? 1 : 0 }];
      if (text.includes("WHERE estado = 'ABIERTA' GROUP BY"))
        return options.cajasDuplicadas ?? [];
      if (text.includes("tipo IN ('TRANSFERENCIA_ENTRADA'"))
        return [{ n: options.movimientosTransferencia ?? 0 }];
      if (text.includes('AS duplicados'))
        return [{ n: options.stockDuplicado ?? 0 }];
      return [];
    },
  };
  return { queryRunner, sqls };
}

const idx = (sqls: string[], fragment: string) =>
  sqls.findIndex((s) => s.includes(fragment));

describe('Multisucursal1762900000000', () => {
  const migration = new Multisucursal1762900000000();

  describe('up', () => {
    it('crea el UNIQUE compuesto de stock ANTES de eliminar el UNIQUE viejo', async () => {
      const { queryRunner, sqls } = fakeQueryRunner({
        stockUniqueViejo: ['REL_dafa790e6b13a93401ca6042f0'],
      });

      await migration.up(queryRunner);

      const crearNuevo = idx(sqls, 'ADD UNIQUE INDEX uq_stock_producto_sucursal (producto_id, sucursal_id)');
      const borrarViejo = idx(sqls, 'DROP INDEX `REL_dafa790e6b13a93401ca6042f0` ON stock');
      expect(crearNuevo).toBeGreaterThanOrEqual(0);
      expect(borrarViejo).toBeGreaterThan(crearNuevo);
    });

    it('rellena sucursal_id antes de pasarlo a NOT NULL y de crear las FKs', async () => {
      const { queryRunner, sqls } = fakeQueryRunner({});
      await migration.up(queryRunner);

      for (const tabla of ['stock', 'movimiento_stock', 'venta', 'compra', 'caja']) {
        const add = idx(sqls, `ALTER TABLE ${tabla} ADD sucursal_id int NULL`);
        const backfill = idx(sqls, `UPDATE ${tabla} SET sucursal_id = ? WHERE sucursal_id IS NULL`);
        const notNull = idx(sqls, `ALTER TABLE ${tabla} MODIFY sucursal_id int NOT NULL`);
        const fk = idx(sqls, `ADD CONSTRAINT FK_${tabla}_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursal (id)`);
        expect(add).toBeGreaterThanOrEqual(0);
        expect(backfill).toBeGreaterThan(add);
        expect(notNull).toBeGreaterThan(backfill);
        expect(fk).toBeGreaterThan(notNull);
      }
    });

    it('crea Casa Central y asigna todos los usuarios no borrados', async () => {
      const { queryRunner, sqls } = fakeQueryRunner({});
      await migration.up(queryRunner);

      const casa = idx(sqls, "SELECT 'Casa Central'");
      const asignar = idx(sqls, 'INSERT IGNORE INTO usuario_sucursal');
      expect(casa).toBeGreaterThanOrEqual(0);
      expect(asignar).toBeGreaterThan(casa);
      expect(sqls[asignar]).toContain('u.deleted_date IS NULL');
    });

    it('agrega columna generada abierta_lock + UNIQUE y los enums de transferencia', async () => {
      const { queryRunner, sqls } = fakeQueryRunner({});
      await migration.up(queryRunner);

      expect(sqls.some((s) => s.includes('abierta_lock') && s.includes('GENERATED ALWAYS AS') && s.includes('STORED'))).toBe(true);
      expect(idx(sqls, 'CREATE UNIQUE INDEX uq_caja_abierta_por_sucursal ON caja (abierta_lock)')).toBeGreaterThanOrEqual(0);
      expect(sqls.some((s) => s.includes('TRANSFERENCIA_ENTRADA') && s.includes('TRANSFERENCIA_SALIDA'))).toBe(true);
      expect(sqls.some((s) => s.includes("tipo_referencia enum ('AJUSTE', 'COMPRA', 'VENTA', 'OTRO', 'TRANSFERENCIA')"))).toBe(true);
    });

    it('crea las tablas de transferencias con numeración global (singleton id=1)', async () => {
      const { queryRunner, sqls } = fakeQueryRunner({});
      await migration.up(queryRunner);

      expect(idx(sqls, 'CREATE TABLE IF NOT EXISTS transferencia (')).toBeGreaterThanOrEqual(0);
      expect(idx(sqls, 'CREATE TABLE IF NOT EXISTS item_transferencia (')).toBeGreaterThanOrEqual(0);
      expect(idx(sqls, 'INSERT INTO transferencia_numeracion (id, ultimo_numero) VALUES (1, 0)')).toBeGreaterThanOrEqual(0);
    });

    it('aborta si ya hay más de una caja ABIERTA en la misma sucursal', async () => {
      const { queryRunner } = fakeQueryRunner({
        cajasDuplicadas: [{ sucursal_id: 1, n: 2 }],
      });
      await expect(migration.up(queryRunner)).rejects.toThrow(/más de una caja ABIERTA/);
    });

    it('no ejecuta migration:run ni toca datos de venta/compra/caja salvo el backfill', async () => {
      const { queryRunner, sqls } = fakeQueryRunner({});
      await migration.up(queryRunner);
      expect(sqls.some((s) => /^(DELETE|TRUNCATE)/i.test(s))).toBe(false);
    });
  });

  describe('down', () => {
    it('restaura el UNIQUE por producto ANTES de eliminar el compuesto', async () => {
      const { queryRunner, sqls } = fakeQueryRunner({
        existing: new Set([
          'idx:stock.uq_stock_producto_sucursal',
          'col:stock.sucursal_id',
        ]),
      });

      await migration.down(queryRunner);

      const crearViejo = idx(sqls, 'ADD UNIQUE INDEX REL_dafa790e6b13a93401ca6042f0 (producto_id)');
      const borrarNuevo = idx(sqls, 'DROP INDEX uq_stock_producto_sucursal ON stock');
      expect(crearViejo).toBeGreaterThanOrEqual(0);
      expect(borrarNuevo).toBeGreaterThan(crearViejo);
    });

    it('elimina tablas de transferencia antes que sucursal y revierte los enums', async () => {
      const { queryRunner, sqls } = fakeQueryRunner({});
      await migration.down(queryRunner);

      const dropTransf = idx(sqls, 'DROP TABLE IF EXISTS transferencia');
      const dropUsuarioSucursal = idx(sqls, 'DROP TABLE IF EXISTS usuario_sucursal');
      const dropSucursal = idx(sqls, 'DROP TABLE IF EXISTS sucursal');
      expect(dropTransf).toBeGreaterThanOrEqual(0);
      expect(dropUsuarioSucursal).toBeGreaterThan(dropTransf);
      expect(dropSucursal).toBeGreaterThan(dropUsuarioSucursal);
      expect(sqls.some((s) => s.includes("MODIFY tipo enum ('COMPRA', 'VENTA', 'AJUSTE_ENTRADA', 'AJUSTE_SALIDA')"))).toBe(true);
    });

    it('aborta sin tocar nada si hay movimientos de transferencia', async () => {
      const { queryRunner, sqls } = fakeQueryRunner({ movimientosTransferencia: 2 });
      await expect(migration.down(queryRunner)).rejects.toThrow(/transferencias/);
      expect(sqls.filter((s) => /^(DROP|ALTER)/.test(s))).toHaveLength(0);
    });

    it('aborta sin tocar nada si hay productos con stock en varias sucursales', async () => {
      const { queryRunner, sqls } = fakeQueryRunner({ stockDuplicado: 1 });
      await expect(migration.down(queryRunner)).rejects.toThrow(/más de una sucursal/);
      expect(sqls.filter((s) => /^(DROP|ALTER)/.test(s))).toHaveLength(0);
    });
  });
});
