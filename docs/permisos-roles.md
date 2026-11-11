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
| Ventas | Registrar, consultar y cancelar | Registrar y consultar (sin cancelar) |
| Caja | Gestión completa + historiales | Solo `GET /caja/activa` |
| Reportes | Todos | Sin acceso (403) |
| Ticket | Consultar y modificar | Solo consultar |

## Campos ocultos para EMPLEADO

| Campo | Dónde | Notas frontend |
|---|---|---|
| `precioCosto` | `GET /producto/search`, `GET /producto/:id` | Tipar como opcional; no mostrar ni calcular márgenes |
| `precioCosto` (anidado en `producto`) | Inventario (stock/movimientos), ítems de venta | Misma regla |
| Costos de compra (`costoUnitario`, subtotales de compra, valorización) | `/compra/*`, `/reporte/*` | Endpoints enteros bloqueados (403) |
| Historial de caja | `GET /caja/search`, `GET /caja/:id`, movimientos | 403; usar solo `/caja/activa` |

ADMIN sigue recibiendo la forma completa de los DTOs.
