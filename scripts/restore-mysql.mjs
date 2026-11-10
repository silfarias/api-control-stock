#!/usr/bin/env node
/**
 * Restaura un backup .sql.gz en una base TEMPORAL aislada.
 * Nunca escribe sobre DB_NAME salvo que se pase un --target distinto.
 *
 * Uso:
 *   yarn restore:mysql -- --file backups/xxx.sql.gz --target dbcontrolstock_restore_test --confirm
 *
 * Tras restaurar, ejecuta comprobaciones básicas (tablas, typeorm_migrations, FKs).
 */
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { finished } from 'node:stream/promises';
import mysql from 'mysql2/promise';
import { loadBackupEnv } from './lib/backup-env.mjs';

function argValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx === process.argv.length - 1) return null;
  return process.argv[idx + 1];
}

const file = argValue('--file');
const target = argValue('--target');
const confirm = process.argv.includes('--confirm');

if (!file || !target || !confirm) {
  console.error(`Uso:
  yarn restore:mysql -- --file <backup.sql.gz> --target <db_temporal> --confirm

No restaura sobre la base de producción automáticamente.`);
  process.exit(1);
}

if (!existsSync(file)) {
  console.error(`Archivo no encontrado: ${file}`);
  process.exit(1);
}

const env = loadBackupEnv();

if (target === env.dbName) {
  console.error(
    `Abortado: --target no puede ser la base operativa (${env.dbName}). Usá un nombre temporal.`,
  );
  process.exit(1);
}

if (!/^[a-zA-Z0-9_]+$/.test(target)) {
  console.error('Abortado: --target solo admite letras, números y _.');
  process.exit(1);
}

const REQUIRED_TABLES = [
  'usuario',
  'auth_session',
  'producto',
  'venta',
  'compra',
  'caja',
  'ticket',
  'typeorm_migrations',
];

function buildMysqlClient(sqlDatabase) {
  // CREATE DATABASE + import requieren cuenta privilegiada (RESTORE_* / root).
  if (env.viaDocker) {
    return {
      cmd: 'docker',
      args: [
        'exec',
        '-i',
        '-e',
        `MYSQL_PWD=${env.restorePassword}`,
        env.dockerContainer,
        'mysql',
        '-u',
        env.restoreUser,
        ...(sqlDatabase ? [sqlDatabase] : []),
      ],
      envExtra: {},
    };
  }
  return {
    cmd: 'mysql',
    args: [
      `-h${env.host}`,
      `-P${env.port}`,
      `-u${env.restoreUser}`,
      ...(sqlDatabase ? [sqlDatabase] : []),
    ],
    envExtra: { MYSQL_PWD: env.restorePassword },
  };
}

async function runMysqlStdin(sqlText, database) {
  const { cmd, args, envExtra } = buildMysqlClient(database);
  const child = spawn(cmd, args, {
    env: { ...process.env, ...envExtra },
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let stderr = '';
  child.stderr.on('data', (c) => {
    stderr += c.toString();
  });
  child.stdin.write(sqlText);
  child.stdin.end();
  const code = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });
  if (code !== 0) {
    throw new Error(
      `mysql falló (exit ${code}): ${stderr.replaceAll(env.restorePassword, '***')}`,
    );
  }
}

async function pipeDumpIntoMysql() {
  // El dump de --databases incluye CREATE DATABASE + USE.
  // Reescribimos el nombre de la base destino de forma segura.
  const { cmd, args, envExtra } = buildMysqlClient(null);
  const child = spawn(cmd, args, {
    env: { ...process.env, ...envExtra },
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });

  let stderr = '';
  child.stderr.on('data', (c) => {
    stderr += c.toString();
  });

  const gunzip = createGunzip();
  const input = createReadStream(file);
  input.pipe(gunzip);

  let buffer = '';
  const sourceDb = env.dbName;
  const rewrite = (chunk) => {
    buffer += chunk.toString('utf8');
    // Reemplazo conservador de CREATE/USE del dump original
    buffer = buffer
      .replaceAll(`CREATE DATABASE /*!32312 IF NOT EXISTS*/ \`${sourceDb}\``,
        `CREATE DATABASE /*!32312 IF NOT EXISTS*/ \`${target}\``)
      .replaceAll(`CREATE DATABASE IF NOT EXISTS \`${sourceDb}\``,
        `CREATE DATABASE IF NOT EXISTS \`${target}\``)
      .replaceAll(`USE \`${sourceDb}\``, `USE \`${target}\``);

    // Enviar por líneas completas para no cortar tokens
    const lastNl = buffer.lastIndexOf('\n');
    if (lastNl === -1) return;
    const ready = buffer.slice(0, lastNl + 1);
    buffer = buffer.slice(lastNl + 1);
    child.stdin.write(ready);
  };

  gunzip.on('data', rewrite);

  await finished(gunzip);
  if (buffer.length) child.stdin.write(buffer);
  child.stdin.end();

  const code = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });
  if (code !== 0) {
    throw new Error(
      `Restauración falló (exit ${code}): ${stderr.replaceAll(env.restorePassword, '***')}`,
    );
  }
}

async function verify() {
  const connection = await mysql.createConnection({
    host: env.host,
    port: env.port,
    user: env.appUser,
    password: env.appPassword,
    database: target,
    multipleStatements: false,
  });

  try {
    const [tables] = await connection.query(
      `SELECT TABLE_NAME AS name
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
      [target],
    );
    const names = new Set(tables.map((t) => t.name));
    const missing = REQUIRED_TABLES.filter((t) => !names.has(t));
    if (missing.length) {
      throw new Error(`Faltan tablas: ${missing.join(', ')}`);
    }

    const [mig] = await connection.query(
      'SELECT COUNT(*) AS c FROM typeorm_migrations',
    );
    const [fk] = await connection.query(
      `SELECT COUNT(*) AS c
       FROM information_schema.REFERENTIAL_CONSTRAINTS
       WHERE CONSTRAINT_SCHEMA = ?`,
      [target],
    );
    const [usuarios] = await connection.query(
      'SELECT COUNT(*) AS c FROM usuario',
    );

    console.log('Verificación básica OK:');
    console.log(`  tablas: ${names.size}`);
    console.log(`  typeorm_migrations: ${mig[0].c}`);
    console.log(`  foreign keys: ${fk[0].c}`);
    console.log(`  usuarios: ${usuarios[0].c}`);
  } finally {
    await connection.end();
  }
}

try {
  console.log(
    `Restaurando ${file} (${statSync(file).size} bytes) → base temporal \`${target}\``,
  );
  // Crear DB vacía primero (por si el dump no trae CREATE o falla el rewrite)
  await runMysqlStdin(
    `CREATE DATABASE IF NOT EXISTS \`${target}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
  );
  await pipeDumpIntoMysql();
  await verify();
  console.log(`Restore OK en \`${target}\`.`);
  console.log(
    'Para probar la API contra esta base: DB_NAME=' +
      target +
      ' yarn start:dev (sin tocar la base operativa).',
  );
  process.exit(0);
} catch (err) {
  console.error(`ERROR restore: ${err.message}`);
  process.exit(1);
}
