-- =============================================================================
-- Usuarios MySQL con privilegios mínimos (plantilla).
-- NO ejecutar tal cual en producción sin reemplazar placeholders y revisar host.
-- NO incluye contraseñas reales.
--
-- Placeholders:
--   <DB_NAME>              nombre de la base (ej: dbcontrolstock)
--   <APP_PASSWORD>         contraseña del usuario de aplicación
--   <MIGRATION_PASSWORD>   contraseña del usuario de migraciones
--   <BACKUP_PASSWORD>      contraseña del usuario de backups
--   <APP_HOST>             host permitido (local Docker: '%'; VPS app en mismo host: 'localhost')
--
-- Ejecutar como root (o admin) UNA vez, fuera del flujo habitual de la API:
--   mysql -u root -p < scripts/sql/03-mysql-users.sql
-- =============================================================================

-- --- Usuario de aplicación (NestJS / TypeORM runtime) ---
-- Solo DML sobre la base de negocio. Sin CREATE/ALTER/DROP.
CREATE USER IF NOT EXISTS 'app_stock'@'<APP_HOST>' IDENTIFIED BY '<APP_PASSWORD>';
GRANT SELECT, INSERT, UPDATE, DELETE ON `<DB_NAME>`.* TO 'app_stock'@'<APP_HOST>';

-- --- Usuario de migraciones (CLI TypeORM: yarn migration:run) ---
-- DDL + DML en la base. Sin privilegios globales (no GRANT OPTION, no SUPER).
CREATE USER IF NOT EXISTS 'migrate_stock'@'<APP_HOST>' IDENTIFIED BY '<MIGRATION_PASSWORD>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES, CREATE VIEW, SHOW VIEW
  ON `<DB_NAME>`.* TO 'migrate_stock'@'<APP_HOST>';

-- --- Usuario de backups (mysqldump / script de respaldo) ---
-- Lectura + LOCK TABLES / PROCESS / RELOAD según mysqldump --single-transaction.
CREATE USER IF NOT EXISTS 'backup_stock'@'<APP_HOST>' IDENTIFIED BY '<BACKUP_PASSWORD>';
GRANT SELECT, LOCK TABLES, SHOW VIEW, TRIGGER, EVENT ON `<DB_NAME>`.* TO 'backup_stock'@'<APP_HOST>';
-- PROCESS es global en MySQL; necesario para algunos dumps consistentes.
GRANT PROCESS ON *.* TO 'backup_stock'@'<APP_HOST>';

FLUSH PRIVILEGES;

-- Verificación sugerida (como root):
--   SHOW GRANTS FOR 'app_stock'@'<APP_HOST>';
--   SHOW GRANTS FOR 'migrate_stock'@'<APP_HOST>';
--   SHOW GRANTS FOR 'backup_stock'@'<APP_HOST>';

-- Revocación de ejemplo (solo si se decide dejar de usar root en la app):
--   -- Actualizar .env: DB_USERNAME=app_stock / DB_PASSWORD=<APP_PASSWORD>
--   -- Para migraciones: DB_USERNAME=migrate_stock al correr yarn migration:run
--   -- Nunca eliminar root del servidor; sí dejar de usarlo desde la API.
