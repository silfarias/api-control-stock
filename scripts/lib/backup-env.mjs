import 'dotenv/config';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Lee variables de backup/MySQL sin imprimir secretos.
 */
export function loadBackupEnv() {
  const dbName = required('DB_NAME');
  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT) || 3306;

  const backupUser =
    process.env.BACKUP_DB_USERNAME || process.env.DB_USERNAME || 'root';
  const backupPassword =
    process.env.BACKUP_DB_PASSWORD ?? process.env.DB_PASSWORD ?? '';

  /** Restauración / CREATE DATABASE: cuenta privilegiada (no usar app_stock). */
  const restoreUser =
    process.env.RESTORE_DB_USERNAME || process.env.DB_USERNAME || 'root';
  const restorePassword =
    process.env.RESTORE_DB_PASSWORD ?? process.env.DB_PASSWORD ?? '';

  const dir = resolve(process.env.BACKUP_DIR || './backups');
  const retentionDays = Math.max(
    1,
    Number(process.env.BACKUP_RETENTION_DAYS) || 7,
  );
  const externalDir = process.env.BACKUP_EXTERNAL_DIR
    ? resolve(process.env.BACKUP_EXTERNAL_DIR)
    : null;

  const viaDocker =
    process.env.BACKUP_VIA_DOCKER === 'true' ||
    process.env.BACKUP_VIA_DOCKER === '1';
  const dockerContainer =
    process.env.BACKUP_DOCKER_CONTAINER || 'control-stock-mysql';

  return {
    dbName,
    host,
    port,
    backupUser,
    backupPassword,
    restoreUser,
    restorePassword,
    dir,
    retentionDays,
    externalDir,
    viaDocker,
    dockerContainer,
    appUser: process.env.DB_USERNAME || 'root',
    appPassword: process.env.DB_PASSWORD || '',
  };
}

export function ensureDir(path) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true, mode: 0o700 });
  }
}

function required(key) {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Falta variable de entorno ${key}`);
  }
  return value;
}

export function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}
