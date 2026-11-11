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
| Reportes | Todos | Sin acceso (403) |
| Ticket | Consultar y modificar | Solo consultar |

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
