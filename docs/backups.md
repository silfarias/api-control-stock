# Backups y restauración MySQL

Estrategia simple para comercio pequeño/mediano: `mysqldump` + compresión + retención + copia externa opcional + cron.

## Política inicial (producción)

| Parámetro | Valor sugerido | Variable |
|-----------|----------------|----------|
| Frecuencia | 1× al día | cron del VPS |
| Retención local | 7 días | `BACKUP_RETENTION_DAYS` |
| Copia externa | Sí (otro disco / Object Storage / PC) | `BACKUP_EXTERNAL_DIR` |
| Prueba de restore | Mensual (base temporal) | procedimiento abajo |

Ajustar según volumen y RPO aceptable (pérdida máxima de datos).

## Generar backup

```bash
# Local con MySQL en Docker:
BACKUP_VIA_DOCKER=true yarn backup:mysql

# VPS con mysqldump en el PATH:
yarn backup:mysql
```

Comportamiento:

- Dump InnoDB con `--single-transaction`.
- Salida `backups/<DB_NAME>_YYYYMMDD_HHMMSS.sql.gz` (modo 0600 cuando el SO lo permite).
- Escribe `.tmp` y solo renombra si `mysqldump` termina en 0 y el archivo no está vacío.
- Si falla, **no** aplica retención (no borra backups previos).
- Contraseña vía `MYSQL_PWD` / env de Docker (no `-p` en línea de comandos visible en logs del script).

Credenciales: `BACKUP_DB_USERNAME` / `BACKUP_DB_PASSWORD` (fallback a `DB_*`).

### Cron de ejemplo (VPS Linux)

```cron
15 3 * * * cd /ruta/api-control-stock && BACKUP_VIA_DOCKER=false /usr/bin/yarn backup:mysql >> /var/log/control-stock-backup.log 2>&1
```

## Restaurar (siempre en base temporal)

**Nunca** restaurar automáticamente sobre la base operativa.

```bash
BACKUP_VIA_DOCKER=true yarn restore:mysql -- \
  --file backups/dbcontrolstock_20261110_120000.sql.gz \
  --target dbcontrolstock_restore_test \
  --confirm
```

Pasos que realiza el script:

1. Rechaza si `--target` = `DB_NAME`.
2. Crea la base temporal.
3. Restaura el dump (reescribe `CREATE DATABASE` / `USE` al target).
4. Comprueba tablas clave, `typeorm_migrations`, FKs y conteo de `usuario`.

Probar la API contra el restore (otra terminal, sin tocar prod):

```bash
DB_NAME=dbcontrolstock_restore_test yarn start:dev
# GET /health y consultas de lectura
```

Cuenta para restore: `RESTORE_DB_USERNAME` (privilegiada; por defecto `DB_USERNAME`/`root`). No usar `app_stock`.

Tras validar, borrar la base temporal a mano cuando ya no haga falta (`DROP DATABASE dbcontrolstock_restore_test` **solo** sobre el nombre temporal, con autorización).

## Antes de migrar en producción

`migration:revert` **no** es plan de recuperación seguro.

1. `yarn backup:mysql` y verificar archivo `.sql.gz` generado.
2. `yarn migration:show` (revisar pendientes).
3. Ejecutar migraciones con usuario `migrate_stock`:  
   `DB_USERNAME=migrate_stock DB_PASSWORD=… yarn migration:run`
4. Verificar API (`/health`, login, operación crítica de lectura).
5. Si falla de forma grave: restaurar el backup en base temporal, validar, y solo entonces planificar el cutover / restore controlado de la operativa (fuera de scripts automáticos).

## Compatibilidad con TypeORM

- El dump incluye datos de `typeorm_migrations`.
- Tras restaurar, `yarn migration:show` (con `DB_NAME` apuntando a la temporal) debe listar las mismas migraciones aplicadas.
- No hace falta volver a correr `InitialSchema` sobre un restore completo.
