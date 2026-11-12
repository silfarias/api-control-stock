# Multisucursal

Desde la migración `1762900000000-Multisucursal` el sistema opera con **varias sucursales**. Este documento
describe la arquitectura, el contrato HTTP (header `x-sucursal-id`), la numeración, la migración y los
cambios que rompen compatibilidad con el frontend.

## 1. Arquitectura

| Concepto | Alcance |
|---|---|
| Catálogo: `producto`, `categoria`, `proveedor` | **Global** (sin sucursal) |
| `stock` | Por **(producto, sucursal)**: `UNIQUE uq_stock_producto_sucursal (producto_id, sucursal_id)` |
| `movimiento_stock`, `venta`, `compra`, `caja` | Pertenecen a **una sucursal** (`sucursal_id NOT NULL`, FK a `sucursal`) |
| Numeración de venta / compra / caja / transferencia | **Global** (ver §3) |
| Configuración de ticket | Global |
| `usuario_sucursal` | Qué sucursales puede operar cada usuario (ADMIN: todas, sin asignación) |

Entidades principales:

- `Sucursal` (`nombre`, `codigo` único —incluye eliminadas—, `direccion`, `telefono`, `activo`, soft delete).
  `CASA-CENTRAL` es la sucursal base creada por la migración y **no puede eliminarse**.
- `Producto ↔ Stock` pasó de OneToOne a **OneToMany** (`producto.stocks`).
- `Venta` guarda un **snapshot** de la sucursal al crearse (`sucursalNombre`, `sucursalDireccion`,
  `sucursalTelefono`): el ticket de una venta antigua no cambia si luego se edita la sucursal.
- Una sola caja `ABIERTA` por sucursal, garantizada en la base (§4).

### Reglas de acceso

- **ADMIN**: puede operar en cualquier sucursal **activa**.
- **EMPLEADO**: solo en las sucursales asignadas (`usuario_sucursal`) y activas. Las búsquedas y lecturas de
  recursos de otras sucursales devuelven `403` (`SU...` acceso denegado).
- Operar sobre una sucursal inactiva o inexistente falla (`400`/`404`).

## 2. Header `x-sucursal-id`

Las operaciones por sucursal reciben el id en el header `x-sucursal-id`, que se valida con:

- `RequireSucursalGuard`: header **obligatorio** (400 si falta o es inválido, 404 si no existe,
  403 si el usuario no tiene acceso, 400 si la sucursal está inactiva). Se ejecuta **después** de `JwtAuthGuard`
  (`@UseGuards(JwtAuthGuard, RequireSucursalGuard)`).
- `OptionalSucursalGuard`: header **opcional**; sin header `request.sucursalId` queda `undefined`, con header se valida igual.
- El id resuelto se lee en los controllers con `@OperativeSucursalId()`.
- Swagger lo documenta con `@ApiSucursalHeader()` / `@ApiSucursalHeader(false)`.

### Endpoints según header

**Obligatorio** (`RequireSucursalGuard`):

| Módulo | Endpoints |
|---|---|
| Inventario | `GET /inventario/search`, `GET /inventario/movimientos/search`, `GET /inventario/producto/:productoId`, `GET /inventario/producto/:productoId/movimientos`, `POST /inventario/ajustes` |
| Venta | `GET /venta/search`, `POST /venta` |
| Compra | `GET /compra/search`, `POST /compra`, `PATCH /compra/:id`, `POST /compra/:id/confirmar`, `POST /compra/:id/cancelar`, `DELETE /compra/:id` |
| Caja | `GET /caja/search`, `GET /caja/activa`, `POST /caja/abrir`, `POST /caja/movimientos`, `GET /caja/movimientos/search` |
| Producto | `POST /producto`, `POST /producto/bulk` (stock inicial en la sucursal del header) |

**Opcional** (`OptionalSucursalGuard`): `GET /producto/search`, `GET /producto/:id`, `PATCH /producto/:id`.
`stockCantidad` en `ProductoDTO` es el de la sucursal del header; **sin header vale 0**.

**Opcional con semántica de consolidado** (solo ADMIN): `GET /reporte/*` (ventas, ventas/diario, productos-top,
stock-bajo, inventario). Con `x-sucursal-id` el reporte es de esa sucursal; **sin header es el consolidado de
todas las sucursales** (ver §8).

**Sin header** (la sucursal sale del propio recurso y se valida el acceso del usuario): `GET /venta/:id`,
`POST /venta/:id/cancelar`, `GET /compra/:id`, `POST /caja/:id/cerrar`, `GET /caja/:id`, `GET /caja/:id/movimientos`,
`DELETE /producto/:id`, catálogos (categoría, proveedor), usuarios, ticket y sucursales. Las transferencias
(`/transferencia/*`, solo ADMIN) tampoco usan el header: origen y destino viajan en el body (ver §9).

### Coherencia recurso ↔ header

- Compra: `update`, `confirmar`, `cancelar`, `remove` verifican que la compra sea de la sucursal del header
  (`SU08 – El registro pertenece a otra sucursal`). Una compra **confirmada** no puede cambiar de sucursal.
- Cancelar una **venta** restituye el stock en **la sucursal de la venta** (no la del header) y revierte el efectivo
  en la caja de esa sucursal; si no hay caja abierta allí falla (`CAJA.NO_ABIERTA`).

## 3. Numeración global

`venta_numeracion`, `compra_numeracion`, `caja_numeracion` (y `transferencia_numeracion`) son tablas singleton
(`id = 1`) bloqueadas con `FOR UPDATE`. **No se reinician por sucursal**: el nº de venta 1500 es único en todo el sistema.
Cada servicio/repositorio lo documenta con un comentario. Consecuencia: la numeración de una sucursal tiene saltos.

## 4. Caja por sucursal

- `caja.abierta_lock` es una columna **generada STORED**: `CASE WHEN estado = 'ABIERTA' THEN sucursal_id ELSE NULL END`,
  con `UNIQUE uq_caja_abierta_por_sucursal (abierta_lock)`. Las cajas cerradas valen `NULL` y no colisionan.
- `abrir` valida en la aplicación (dentro del lock de numeración) y, ante una carrera, traduce el
  `ER_DUP_ENTRY` del índice a `CAJA.YA_ABIERTA` ("Ya existe una caja abierta en esta sucursal").
- Las ventas en efectivo registran el movimiento en la caja abierta de **su** sucursal.

## 5. Inventario

- `aplicarMovimiento` exige `sucursalId` y bloquea (`FOR UPDATE`) solo la fila `(producto, sucursal)`; ventas en
  sucursales distintas no se serializan. Si la fila no existe se crea con `INSERT IGNORE` y se vuelve a bloquear.
- Crear un **producto** crea filas de stock en 0 en todas las sucursales activas; si trae stock inicial, el movimiento
  se registra solo en la sucursal del header.
- Crear una **sucursal** crea (en la misma transacción) filas en 0 para todos los productos.
- Tipos de movimiento nuevos: `TRANSFERENCIA_ENTRADA`, `TRANSFERENCIA_SALIDA` (referencia `TRANSFERENCIA`),
  los genera la confirmación de una transferencia (§9) mediante `registrarSalidaPorTransferencia` /
  `registrarEntradaPorTransferencia`.
- `DELETE /sucursal/:id`: no permite eliminar `CASA-CENTRAL`, ni sucursales con ventas, compras, cajas, movimientos
  de stock (aunque estén soft-deleted) o stock > 0 → `SUCURSAL.NO_ELIMINABLE` con los conteos. En ese caso solo se desactiva.

## 6. Migración `1762900000000-Multisucursal`

Pasos de `up()` (idempotente donde es posible; ver comentarios en el archivo):

1. `CREATE TABLE sucursal`, `usuario_sucursal`.
2. Inserta **Casa Central** (`CASA-CENTRAL`; dirección/teléfono tomados de la config de ticket si existe).
3. Asigna **todos los usuarios no borrados** a Casa Central.
4. `sucursal_id` nullable en `stock`, `movimiento_stock`, `venta`, `compra`, `caja` → backfill con Casa Central.
5. `stock`: crea `uq_stock_producto_sucursal` **y después** elimina el UNIQUE viejo `REL_dafa790e6b13a93401ca6042f0`
   (MySQL no deja borrarlo antes porque respalda el FK a `producto`; error 1553). Si el nombre difiere, se detecta
   vía `information_schema`.
6. `sucursal_id NOT NULL` + índice + FK `FK_<tabla>_sucursal`.
7. `venta`: columnas snapshot (`sucursal_nombre` NOT NULL default `''`, `sucursal_direccion`, `sucursal_telefono`)
   con backfill desde la sucursal.
8. `caja`: `abierta_lock` + `uq_caja_abierta_por_sucursal` (aborta si ya hubiese dos cajas abiertas en la misma sucursal).
9. ENUM `movimiento_stock.tipo` (+ `TRANSFERENCIA_ENTRADA/SALIDA`) y `tipo_referencia` (+ `TRANSFERENCIA`).
10. `transferencia`, `item_transferencia`, `transferencia_numeracion` (singleton global).

> En MySQL el DDL hace **commit implícito**: si algo falla a mitad de camino no hay rollback automático.
> Por eso se prueba siempre sobre una copia y se restaura el backup ante cualquier error.

### Procedimiento recomendado (no se ejecutó en el desarrollo)

1. `yarn backup:mysql` sobre producción (ver `backups.md`) y guardar el archivo fuera del servidor.
2. Restaurar ese backup en una **base copia** (otro nombre/instancia) y apuntar `.env` a esa copia.
3. `yarn migration:show` → debe listar `Multisucursal1762900000000` como pendiente.
4. `yarn migration:run` **sobre la copia**.
5. Verificar en la copia:
   - `SELECT COUNT(*) FROM stock WHERE sucursal_id IS NULL;` (y lo mismo para movimiento_stock, venta, compra, caja) → 0.
   - `SELECT COUNT(*) FROM usuario_sucursal;` = cantidad de usuarios no borrados.
   - `SHOW INDEX FROM stock;` → existe `uq_stock_producto_sucursal` y no `REL_dafa790e…`.
   - `SHOW INDEX FROM caja;` → `uq_caja_abierta_por_sucursal`.
   - Totales de `stock.cantidad`, ventas y compras iguales a los previos al migrar.
6. Levantar la API contra la copia y probar los flujos (venta, compra, caja, ajustes) con `x-sucursal-id`.
7. Recién entonces repetir 1 y 4 en producción en una ventana de mantenimiento (API detenida).

### `down()`

Revierte en orden inverso, y **aborta sin modificar nada** si:

- existen movimientos de stock de transferencia (`TRANSFERENCIA_*`), o
- hay productos con stock en más de una sucursal (el esquema anterior exige `UNIQUE(producto_id)`): consolidar antes.

Tras revertir se pierde la atribución por sucursal y los snapshots. Usar `migration:revert` solo en bases de prueba.

## 7. Cambios que rompen compatibilidad (frontend)

1. **Enviar `x-sucursal-id`** en todos los endpoints marcados como obligatorios en §2. Sin él: `400`
   (`SU` header requerido). Obtener las sucursales operables con `GET /sucursal/me` y guardar la elegida.
2. `stockCantidad` de producto depende del header (opcional); sin header es `0`.
3. DTOs con el nuevo campo `sucursal` (`{ id, nombre, codigo, … }`): `StockDTO`, `MovimientoStockDTO`, `VentaDTO`,
   `CajaDTO`, `CompraDTO`.
4. `VentaDTO` incluye `sucursalNombre`, `sucursalDireccion`, `sucursalTelefono` (usar estos para imprimir tickets
   en lugar de la config global de ticket para dirección/teléfono; ver §10).
5. Las búsquedas de inventario, venta, compra y caja devuelven **solo la sucursal del header**. Los reportes
   filtran por sucursal si hay header y **consolidan todas las sucursales si no lo hay** (header opcional).
6. Caja: `GET /caja/activa` y `POST /caja/abrir` son por sucursal; puede haber una caja abierta por sucursal.
7. Nuevos códigos de error: `SU08` (recurso de otra sucursal), `CAJA.YA_ABIERTA` / `CAJA.NO_ABIERTA` ahora hablan de "esta sucursal",
   `SUCURSAL.NO_ELIMINABLE` (con conteos en `details`).
8. EMPLEADO solo ve/opera sucursales asignadas (`PUT /sucursal/usuario/:usuarioId/asignaciones`, solo ADMIN).
9. Nuevos tipos de movimiento (`TRANSFERENCIA_ENTRADA/SALIDA`) y tipo de referencia (`TRANSFERENCIA`) en los enums.
10. La numeración sigue siendo global: no mostrar el número como correlativo por sucursal.

## 8. Reportes consolidados

`GET /reporte/ventas`, `/reporte/ventas/diario`, `/reporte/productos-top`, `/reporte/stock-bajo`, `/reporte/inventario`
(solo ADMIN: `JwtAuthGuard` + `AdminGuard` + `OptionalSucursalGuard`; EMPLEADO recibe 403).

| Header `x-sucursal-id` | Alcance |
|---|---|
| Presente | Solo esa sucursal (`venta.sucursal_id` / `stock.sucursal_id`). Se valida como siempre (404/403/400). |
| Ausente | **Consolidado de TODAS las sucursales**: ventas sin filtro de sucursal; stock sumado por producto entre sucursales. |

- `stock-bajo` consolidado compara la **suma** del stock del producto contra su `minimo_stock` (el mínimo es del producto, no de la sucursal).
- `inventario` consolidado valoriza el stock total del producto (una fila por producto).
- La forma de las respuestas es idéntica en ambos modos; Swagger documenta el header como opcional.

## 9. Transferencias entre sucursales (fase 5)

Módulo `transferencia` (tablas `transferencia`, `item_transferencia`, `transferencia_numeracion`). **Solo ADMIN**
(`JwtAuthGuard` + `AdminGuard`); no usa `x-sucursal-id` (origen y destino van en el body). Numeración **global**.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/transferencia/search` | Búsqueda paginada. Filtros: `estado`, `sucursalOrigenId`, `sucursalDestinoId`, `sucursalId` (origen o destino), `usuarioId`, `id`, `q` |
| `GET` | `/transferencia/:id` | Detalle con sucursales, usuario e ítems |
| `POST` | `/transferencia` | Crea BORRADOR (`sucursalOrigenId`, `sucursalDestinoId`, `observacion?`, `items[{productoId, cantidad}]`) |
| `PATCH` | `/transferencia/:id` | Edita un BORRADOR (si se envían `items`, reemplazan a todos) |
| `POST` | `/transferencia/:id/confirmar` | Mueve el stock en una transacción |
| `POST` | `/transferencia/:id/cancelar` | BORRADOR → CANCELADA |
| `DELETE` | `/transferencia/:id` | Soft-delete, solo BORRADOR |

Reglas:

- Origen ≠ destino, ambas sucursales **activas**, al menos un ítem, `cantidad` entera > 0 y sin productos repetidos. El usuario sale del JWT.
- **Confirmar**: transacción con lock pesimista sobre la transferencia. Por cada ítem: `TRANSFERENCIA_SALIDA` en el origen y
  `TRANSFERENCIA_ENTRADA` en el destino (`tipoReferencia = TRANSFERENCIA`, `referenciaId = transferencia.id`). Si el stock del
  origen no alcanza (`IN01`) se revierte **todo** (nada queda a medias). Los ítems se procesan ordenados por producto y las
  sucursales por id para tomar los locks en orden estable (evita deadlocks entre transferencias cruzadas).
- Confirmar una transferencia ya confirmada devuelve `400` `TR01` sin tocar stock (el segundo request concurrente espera el lock y ve el estado final).
- Una transferencia CONFIRMADA es inmutable: no se edita, cancela ni elimina. No existe "revertir"; se corrige con otra transferencia en sentido inverso.
- Errores: `TR01` ya confirmada, `TR02` sin ítems, `TR03` estado inválido, `TR04` origen = destino, `TR05` producto repetido; además `SU01/SU02` (sucursal inexistente/inactiva) e `IN01` (stock insuficiente).

## 10. Ticket y snapshot de sucursal

- **Configuración de ticket (global)**, `GET/PATCH /ticket`: `paperMm`, `comercio`, `cuit`, `mensaje` (y `direccion`/`telefono` globales, que quedan como fallback). Es única para todo el sistema.
- **Datos de la sucursal (por venta)**: `VentaDTO` expone `sucursal` (datos **vigentes**, `SucursalDTO`) y el **snapshot inmutable** tomado al crear la venta:
  `sucursalNombre`, `sucursalDireccion`, `sucursalTelefono`.
- Para imprimir el comprobante: `comercio`, `cuit`, `paperMm` y `mensaje` de la config global + `sucursalNombre`, `sucursalDireccion`
  y `sucursalTelefono` **de la venta** (no de la sucursal actual ni de `direccion`/`telefono` globales). Así un ticket reimpreso años
  después sigue mostrando la sucursal y los datos de ese momento aunque la sucursal se renombre o se mude.
- El snapshot viene en `GET /venta/:id`, `GET /venta/search`, `POST /venta` y `POST /venta/:id/cancelar`.
