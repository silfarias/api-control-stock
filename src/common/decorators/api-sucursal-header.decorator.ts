import { applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';

/**
 * Documenta en Swagger el header `x-sucursal-id` (sucursal operativa).
 * @param required `true` con RequireSucursalGuard; `false` con OptionalSucursalGuard.
 */
export function ApiSucursalHeader(required = true) {
  return applyDecorators(
    ApiHeader({
      name: 'x-sucursal-id',
      required,
      description: required
        ? 'ID de la sucursal operativa (obligatorio). ADMIN: cualquier sucursal activa; EMPLEADO: solo las asignadas.'
        : 'ID de la sucursal operativa (opcional). Si se envía, se valida acceso y se usa para contextualizar la respuesta (p. ej. stock).',
      example: '1',
    }),
  );
}
