# Migraciones TypeORM

El esquema MySQL se gestiona con migraciones formales. `synchronize` queda en `false` salvo `DB_SYNCHRONIZE=true` en entornos no productivos (desaconsejado). En `NODE_ENV=production` está bloqueado.

Tabla de control: `typeorm_migrations`.

## Scripts

| Comando | Uso |
|---------|-----|
| `yarn migration:generate` | Diff entidades ↔ DB → nuevo archivo en `src/database/migrations/` |
| `yarn migration:create src/database/migrations/Nombre` | Archivo vacío manual |
| `yarn migration:run` | Aplica pendientes |
| `yarn migration:show` | Lista aplicadas / pendientes |
| `yarn migration:revert` | Revierte la última (solo DB de prueba) |
| `yarn migration:baseline --confirm` | Marca `InitialSchema` sin ejecutar DDL |

CLI: `node --import tsx` + DataSource en `src/config/data-source.config.ts`.

## Base nueva

```bash
docker compose up -d
cp .env.example .env   # completar DB_* y JWT
yarn migration:run
yarn start:dev
yarn seed:admin        # si SEED_ADMIN_ENABLED=true
```

## Antes de migrar en producción

1. `yarn backup:mysql` y confirmar el `.sql.gz` (ver [backups.md](backups.md)).
2. `yarn migration:show`
3. `yarn migration:run` (usuario `migrate_stock` en prod)
4. Verificar API
5. Si falla de forma grave: restaurar el backup en una base **temporal** y planificar recuperación. **No** confiar en `migration:revert` como plan principal.

## Base existente (creada con synchronize)

No correr `migration:run` de `InitialSchema` si las tablas ya existen: fallaría al recrearlas.

1. Backup lógico (`yarn backup:mysql`).
2. Comparar esquema vs entidades, por ejemplo:
   ```bash
   yarn typeorm schema:log -d src/config/data-source.config.ts
   ```
   Debe decir que no hay queries pendientes. Si hay diferencias, resolverlas a mano **antes** del baseline (no asumir que todas las bases son iguales).
3. Baseline (solo inserta en `typeorm_migrations`):
   ```bash
   yarn migration:baseline --confirm
   ```
4. Verificar: `yarn migration:show` → `InitialSchema` marcada `[X]`.
5. Arrancar con `DB_SYNCHRONIZE` ausente/false.

## Restricciones

- No usar `schema:sync` en producción.
- No ejecutar `migration:revert` sobre datos reales.
- Revisar a mano cualquier `migration:generate` antes de aplicarlo (evitar DDL destructivo).
