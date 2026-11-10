#!/usr/bin/env node
/**
 * Backup lógico MySQL (mysqldump) → .sql.gz
 * - No imprime contraseñas
 * - Escribe a archivo .tmp y renombra solo si el dump termina OK
 * - Retención configurable; no borra backups viejos si falla el nuevo
 * - Copia opcional a BACKUP_EXTERNAL_DIR
 *
 * Uso:
 *   yarn backup:mysql
 *   BACKUP_VIA_DOCKER=true yarn backup:mysql   # local con contenedor Docker
 */
import { spawn } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  createWriteStream,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { finished } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import { join } from 'node:path';
import {
  ensureDir,
  loadBackupEnv,
  stamp,
} from './lib/backup-env.mjs';

const env = loadBackupEnv();
ensureDir(env.dir);

const baseName = `${env.dbName}_${stamp()}`;
const finalPath = join(env.dir, `${baseName}.sql.gz`);
const tmpPath = `${finalPath}.tmp`;

function cleanupTmp() {
  try {
    unlinkSync(tmpPath);
  } catch {
    /* ignore */
  }
}

function buildDumpArgs() {
  // --single-transaction: consistente para InnoDB sin bloquear escrituras largas
  // --routines/--triggers/--events: objetos de esquema útiles al restaurar
  const common = [
    '--single-transaction',
    '--quick',
    '--routines',
    '--triggers',
    '--events',
    '--set-gtid-purged=OFF',
    '--databases',
    env.dbName,
  ];

  if (env.viaDocker) {
    return {
      cmd: 'docker',
      args: [
        'exec',
        '-e',
        `MYSQL_PWD=${env.backupPassword}`,
        env.dockerContainer,
        'mysqldump',
        '-u',
        env.backupUser,
        ...common,
      ],
      // MYSQL_PWD va en argv de docker exec -e (no aparece en ps del host como -pxxx)
      redactHint: `docker exec … mysqldump -u ${env.backupUser} … ${env.dbName}`,
    };
  }

  return {
    cmd: 'mysqldump',
    args: [
      `-h${env.host}`,
      `-P${env.port}`,
      `-u${env.backupUser}`,
      ...common,
    ],
    envExtra: { MYSQL_PWD: env.backupPassword },
    redactHint: `mysqldump -h ${env.host} -P ${env.port} -u ${env.backupUser} … ${env.dbName}`,
  };
}

async function runDump() {
  const { cmd, args, envExtra, redactHint } = buildDumpArgs();
  console.log(`Iniciando backup: ${redactHint}`);
  console.log(`Destino temporal: ${tmpPath}`);

  const gzip = createGzip({ level: 9 });
  const out = createWriteStream(tmpPath, { mode: 0o600, flags: 'w' });
  gzip.pipe(out);

  const child = spawn(cmd, args, {
    env: { ...process.env, ...(envExtra || {}) },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });
  child.stdout.pipe(gzip);

  const code = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });

  // Esperar a que gzip/out cierren (si el hijo falló, destruir el stream)
  if (code !== 0) {
    gzip.destroy();
    out.destroy();
    cleanupTmp();
    const safeErr = stderr.replaceAll(env.backupPassword, '***');
    throw new Error(
      `mysqldump falló (exit ${code}). No se generó backup final.\n${safeErr}`,
    );
  }

  await finished(out);

  if (!statSync(tmpPath).size) {
    cleanupTmp();
    throw new Error('Backup vacío; se descartó el archivo temporal.');
  }

  renameSync(tmpPath, finalPath);
  try {
    chmodSync(finalPath, 0o600);
  } catch {
    /* Windows puede ignorar mode */
  }

  console.log(`Backup OK: ${finalPath} (${statSync(finalPath).size} bytes)`);
  return finalPath;
}

function pruneOldBackups() {
  const cutoff = Date.now() - env.retentionDays * 24 * 60 * 60 * 1000;
  const files = readdirSync(env.dir)
    .filter((f) => f.startsWith(`${env.dbName}_`) && f.endsWith('.sql.gz'))
    .map((f) => {
      const full = join(env.dir, f);
      return { full, mtime: statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  let removed = 0;
  for (const file of files) {
    if (file.mtime < cutoff) {
      unlinkSync(file.full);
      removed += 1;
      console.log(`Retención: eliminado ${file.full}`);
    }
  }
  if (removed === 0) {
    console.log(
      `Retención: nada que borrar (mantener ${env.retentionDays} días).`,
    );
  }
}

function copyExternal(finalPath) {
  if (!env.externalDir) {
    return;
  }
  ensureDir(env.externalDir);
  const dest = join(env.externalDir, finalPath.split(/[/\\]/).pop());
  copyFileSync(finalPath, dest);
  try {
    chmodSync(dest, 0o600);
  } catch {
    /* ignore */
  }
  console.log(`Copia externa OK: ${dest}`);
}

try {
  const finalPath = await runDump();
  // Solo tras éxito: retención y copia externa
  pruneOldBackups();
  copyExternal(finalPath);
  process.exit(0);
} catch (err) {
  cleanupTmp();
  console.error(`ERROR backup: ${err.message}`);
  process.exit(1);
}
