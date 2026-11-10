/**
 * Marca la migración inicial como aplicada SIN ejecutar DDL.
 * Uso (solo tras verificar el esquema a mano):
 *   node scripts/migration-baseline.mjs --confirm
 *
 * No hace DROP/TRUNCATE ni altera tablas de negocio.
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';

const MIGRATION = {
  timestamp: 1794325489312,
  name: 'InitialSchema1794325489312',
};

const REQUIRED_TABLES = [
  'usuario',
  'auth_session',
  'categoria',
  'producto',
  'stock',
  'movimiento_stock',
  'proveedor',
  'compra',
  'compra_numeracion',
  'item_compra',
  'venta',
  'venta_numeracion',
  'item_venta',
  'caja',
  'caja_numeracion',
  'movimiento_caja',
  'ticket',
];

if (!process.argv.includes('--confirm')) {
  console.error(
    'Abortado: este script solo escribe en typeorm_migrations. Reejecutá con --confirm tras verificar el esquema.',
  );
  process.exit(1);
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});

try {
  const [tables] = await connection.query(
    `SELECT TABLE_NAME AS name
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'`,
  );
  const present = new Set(tables.map((row) => row.name));
  const missing = REQUIRED_TABLES.filter((name) => !present.has(name));
  if (missing.length > 0) {
    throw new Error(
      `Faltan tablas requeridas para baseline: ${missing.join(', ')}. No se marcó ninguna migración.`,
    );
  }

  await connection.query(`
    CREATE TABLE IF NOT EXISTS typeorm_migrations (
      id INT NOT NULL AUTO_INCREMENT,
      timestamp BIGINT NOT NULL,
      name VARCHAR(255) NOT NULL,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB
  `);

  const [existing] = await connection.query(
    'SELECT id FROM typeorm_migrations WHERE timestamp = ? OR name = ? LIMIT 1',
    [MIGRATION.timestamp, MIGRATION.name],
  );
  if (existing.length > 0) {
    console.log(
      `Baseline ya aplicado: ${MIGRATION.name} (id=${existing[0].id}). Nada que hacer.`,
    );
    process.exit(0);
  }

  await connection.query(
    'INSERT INTO typeorm_migrations (timestamp, name) VALUES (?, ?)',
    [MIGRATION.timestamp, MIGRATION.name],
  );
  console.log(
    `Baseline OK: marcada ${MIGRATION.name} en ${process.env.DB_NAME} sin ejecutar DDL.`,
  );
} finally {
  await connection.end();
}
