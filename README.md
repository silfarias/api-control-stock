# API Control de Stock

API REST para gestión de stock, compras, ventas y caja de un negocio minorista (ropa deportiva, etc.).

Stack: **NestJS 12 (ESM)** · **TypeORM** · **MySQL 9.7** · **JWT** · **Swagger** · **Yarn 4**

---

## Qué incluye (MVP)

| Módulo | Responsabilidad |
|--------|-----------------|
| **Auth / Usuario** | Login, refresh, signup (empleado), seed admin, roles `ADMIN` / `EMPLEADO` |
| **Categoría / Producto** | Catálogo; producto con stock inicial opcional y alta en lote (`/producto/bulk`) |
| **Inventario** | Única fuente de verdad del stock (movimientos inmutables: compra, venta, ajustes) |
| **Proveedor / Compra** | Compras en borrador → confirmar (entra stock) o cancelar |
| **Venta** | Venta confirmada; precios desde producto; descuenta stock |
| **Caja** | Apertura/cierre; ventas en efectivo requieren caja abierta |
| **Reporte** | Ventas, diario, top productos, stock bajo, valorización de inventario |
| **Health** | `GET /health` (DB) |

### Flujo operativo

```
Categorías → Productos (stock 0 o inicial)
                ↓
Proveedores → Compras (confirmar) → ↑ STOCK
                ↓
         Abrir caja → Ventas → Cerrar caja
                ↓
             Reportes
```

Regla clave: **solo `InventarioService` modifica stock**. Compra/venta/ajustes delegan ahí.

---

## Requisitos

- Node.js 22+
- Yarn 4
- Docker (MySQL)

---

## Arranque rápido

```bash
# 1. Dependencias
yarn install

# 2. Variables de entorno
cp .env.example .env
# Completar DB_* y JWT secrets (mín. 16 chars)

# 3. Base de datos
docker compose up -d

# 4. API
yarn start:dev

# 5. Admin inicial (con SEED_ADMIN_ENABLED=true)
yarn seed:admin
```

- API: http://localhost:3000  
- Swagger: http://localhost:3000/api  
- Health: http://localhost:3000/health  

---

## Scripts

| Comando | Descripción |
|---------|-------------|
| `yarn start:dev` | Desarrollo con watch |
| `yarn build` / `yarn start:prod` | Build y producción |
| `yarn seed:admin` | Crea/autentica admin (`POST /auth/seed-admin`) |
| `yarn lint` | Oxlint |
| `yarn test` / `yarn test:e2e` | Tests |

---

## Auth

1. `POST /auth/login` → `access_token` + `refresh_token`  
2. Header: `Authorization: Bearer <access_token>`  
3. Endpoints de escritura sensibles: **JWT + ADMIN**

Seed admin (solo si `SEED_ADMIN_ENABLED=true`):

```bash
yarn seed:admin
# o POST /auth/seed-admin
```

En producción: `SEED_ADMIN_ENABLED=false`.

---

## Módulos y endpoints principales

| Prefijo | Notas |
|---------|--------|
| `/auth` | login, signup, me, refresh, change-password, seed-admin |
| `/usuario` | CRUD (admin) |
| `/categoria` | CRUD |
| `/producto` | CRUD + `POST /bulk` + stock opcional en create |
| `/inventario` | stock, movimientos, ajustes |
| `/proveedor` | CRUD |
| `/compra` | borrador → confirmar / cancelar |
| `/venta` | alta (descuenta stock; efectivo → caja) |
| `/caja` | abrir, cerrar, movimientos |
| `/reporte` | ventas, diario, productos-top, stock-bajo, inventario |

Detalle y schemas: Swagger en `/api`.

---

## Arquitectura

```
Controller → Service → Repository + Mapper
                ↓
         InventarioService (stock)
```

- Entidades con `BaseEntity` (id, created/updated/deleted)  
- Soft-delete en bajas  
- Errores tipados en `src/common/errors/errors-codes.ts`  
- Convenciones en `rules/*.mdc`  

---

## Variables de entorno

Ver `.env.example`:

- `DB_*` — MySQL  
- `ACCESS_TOKEN_*` — JWT  
- `SEED_ADMIN_*` — bootstrap admin  
- `THROTTLE_*` — rate limit (opcional)  
- `DB_TIMEZONE` — default `-03:00`  

---

## Fuera de alcance (a propósito)

Sucursales, transferencias, facturación electrónica, lotes/vencimientos, promociones, clientes/CRM, cuentas corrientes, devoluciones complejas, permisos granulares.

---

## Licencia

Privado / UNLICENSED.
