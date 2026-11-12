# Permisos por rol (ADMIN / EMPLEADO)

Roles del sistema: `ADMIN` y `EMPLEADO`. No hay permisos dinámicos en base de datos.

Protección: `JwtAuthGuard` (autenticado) + `AdminGuard` (solo ADMIN). En respuestas de producto, `precioCosto` se omite para EMPLEADO vía mappers.

## Matriz

| Módulo | ADMIN | EMPLEADO |
|---|---|---|
| Usuarios | Gestión completa | Solo `PATCH` de su propio perfil (nombre, email, password; sin `role`) |
| Categorías | CRUD | Consultar |
| Productos | CRUD + `precioCosto` | Consultar sin `precioCosto` |
| Inventario | Consultar y ajustar | Consultar stock/movimientos (producto anidado sin `precioCosto`) |
| Proveedores | CRUD | Consultar |
| Compras | Gestión completa | Sin acceso (403) |
| Ventas | Registrar, consultar y cancelar | Registrar y consultar (sin cancelar). Filtro opcional `fecha=YYYY-MM-DD` |
| Caja | Abrir/cerrar cualquier caja, historial, movimientos manuales | Abrir si no hay abierta; cerrar solo la propia; consultar activa/historial/movimientos (lectura). Sin movimientos manuales |
| Reportes | Todos. `x-sucursal-id` opcional: con header = esa sucursal, sin header = consolidado de todas | Sin acceso (403) |
| Ticket | Consultar y modificar | Solo consultar |
| Sucursales | CRUD, activar/desactivar, asignar usuarios (`PUT /sucursal/usuario/:usuarioId/asignaciones`) | Solo ver las propias (`GET /sucursal/me`) |
| Transferencias | Crear, editar borrador, confirmar, cancelar, eliminar borrador y consultar (todas las sucursales) | Sin acceso (403) |

## Sucursales (`x-sucursal-id`)

La mayoría de las operaciones (inventario, ventas, compras, caja, alta de producto) exigen el header `x-sucursal-id`,
validado por `RequireSucursalGuard` después de `JwtAuthGuard`:

| Rol | Sucursales en las que puede operar |
|---|---|
| ADMIN | Cualquier sucursal **activa** (no necesita asignación) |
| EMPLEADO | Solo las **asignadas** en `usuario_sucursal` y activas; si no, `403` (`SU03`) |

- Header ausente o inválido → `400` (`SU06` / `SU07`); sucursal inexistente → `404` (`SU01`); inactiva → `400` (`SU02`).
- Header **opcional** (`OptionalSucursalGuard`): productos (`stockCantidad` de esa sucursal; sin header vale 0) y reportes (sin header = consolidado, solo ADMIN).
- Un registro solo se modifica desde su propia sucursal (`SU08`), p. ej. compras. Cancelar una venta restituye stock y caja en la sucursal **de la venta**.
- Ver el detalle completo en `multisucursal.md`.

## Transferencias entre sucursales

Todos los endpoints de `/transferencia` usan `JwtAuthGuard` + `AdminGuard` y **no** usan `x-sucursal-id`
(origen y destino van en el body); un EMPLEADO recibe `403` (`AR02`).

| Endpoint | Acción |
|---|---|
| `GET /transferencia/search`, `GET /transferencia/:id` | Consultar (todas las sucursales) |
| `POST /transferencia` | Crear borrador (origen ≠ destino, ambas activas) |
| `PATCH /transferencia/:id` | Editar (solo BORRADOR) |
| `POST /transferencia/:id/confirmar` | Mover stock origen → destino en una transacción |
| `POST /transferencia/:id/cancelar` | BORRADOR → CANCELADA |
| `DELETE /transferencia/:id` | Soft-delete (solo BORRADOR) |

Una transferencia CONFIRMADA no se puede editar, cancelar ni eliminar. Si el stock del origen no alcanza, la confirmación falla completa (`IN01`).

## Caja — responsables

- `usuario` / `usuario_id`: quien abrió (JWT al abrir).
- `usuarioCierre` / `usuario_cierre_id`: quien cerró (JWT al cerrar; null si abierta o historial previo a la migración).
- EMPLEADO no puede cerrar una caja sin opener acreditado ni una abierta por otro usuario (403, `CJ05`).

## Campos ocultos para EMPLEADO

| Campo | Dónde | Notas frontend |
|---|---|---|
| `precioCosto` | `GET /producto/search`, `GET /producto/:id` | Tipar como opcional; no mostrar ni calcular márgenes |
| `precioCosto` (anidado en `producto`) | Inventario (stock/movimientos), ítems de venta | Misma regla |
| Costos de compra (`costoUnitario`, subtotales de compra, valorización) | `/compra/*`, `/reporte/*` | Endpoints enteros bloqueados (403) |

ADMIN sigue recibiendo la forma completa de los DTOs.

## Filtro `fecha` en ventas

`GET /venta/search?fecha=2026-11-11`

- Opcional; se combina con `estado`, `metodoPago`, `q` y paginación.
- Día calendario en zona comercial de la DB (`DB_TIMEZONE`, típ. `-03:00`).
- Rango: `created_date >= día 00:00:00` y `created_date < día+1 00:00:00`.
- Fechas inválidas → 400.
