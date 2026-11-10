# Seguridad MySQL

## Estado actual (desarrollo local)

| Aspecto | Situación |
|---------|-----------|
| Imagen | `mysql:9.7` vía `docker-compose.yml` |
| Puerto | Publicado solo en `127.0.0.1:3306` (no en todas las interfaces) |
| Usuario app | Por defecto `root` en `.env` local (aceptable solo en desarrollo) |
| Contraseña root | Coincide con `DB_PASSWORD` en Compose (simplifica local; **no** usar así en VPS) |
| TypeORM | `synchronize: false`; migraciones formales |
| TLS | No aplica en conexión localhost; obligatorio si MySQL y API están en hosts distintos |

## Riesgos a corregir antes de producción

1. **No usar `root` desde NestJS** en el VPS. Crear usuarios con privilegios mínimos.
2. **No publicar `3306` a Internet**. En Hostinger/VPS: firewall + MySQL solo en red privada o `localhost`.
3. **Separar secretos**: root ≠ app ≠ migraciones ≠ backups.
4. Si la API y MySQL no comparten host: exigir TLS (`ssl` en el cliente) o túnel privado; nunca MySQL abierto al mundo.

## Usuarios recomendados

Plantilla: [`scripts/sql/03-mysql-users.sql`](../scripts/sql/03-mysql-users.sql) (placeholders, sin contraseñas reales).

| Usuario | Uso | Privilegios (resumen) |
|---------|-----|------------------------|
| `app_stock` | API Nest (`DB_USERNAME`) | `SELECT, INSERT, UPDATE, DELETE` sobre la base |
| `migrate_stock` | `yarn migration:run` | DML + DDL (`CREATE/ALTER/DROP/INDEX/…`) sobre la base |
| `backup_stock` | `yarn backup:mysql` | `SELECT, LOCK TABLES, SHOW VIEW, TRIGGER, EVENT` + `PROCESS` |

**No ejecutar ese SQL sobre la base actual sin autorización explícita.** En local se puede seguir con `root` mientras se prueba.

### Flujo sugerido en VPS (cuando se autorice)

1. Conectar como root solo por consola local / panel.
2. Sustituir placeholders y aplicar `03-mysql-users.sql`.
3. Actualizar `.env` de la API: `DB_USERNAME=app_stock`.
4. Para migraciones: exportar temporalmente `DB_USERNAME=migrate_stock` (o un `.env.migrate`) y correr `yarn migration:run`.
5. Backups: `BACKUP_DB_USERNAME=backup_stock`.

## Conexiones TypeORM

- Host/puerto/usuario desde `DB_*` (`src/config/data-source.config.ts`).
- En el mismo VPS: `DB_HOST=127.0.0.1` (o nombre del servicio Docker interno) y **sin** publicar 3306 al exterior.
- Desarrollo: Compose enlaza `127.0.0.1:${DB_PORT}` → el backend en el host sigue funcionando.

## Recreación local del puerto

Tras cambiar el binding en Compose:

```bash
docker compose up -d
```

Si el contenedor ya existía con el mapeo anterior, recrearlo (`docker compose up -d --force-recreate mysql`) cuando convenga; no borra el volumen de datos.
