import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Inyecta la sucursal operativa (`number`) resuelta por `RequireSucursalGuard`
 * a partir del header `x-sucursal-id`. Requiere `@UseGuards(JwtAuthGuard, RequireSucursalGuard)`.
 *
 * Con `OptionalSucursalGuard` y sin header, el valor es `undefined`
 * (tipar el parámetro como `number | undefined`).
 */
export const OperativeSucursalId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): number => {
    const request = context.switchToHttp().getRequest<{ sucursalId: number }>();
    return request.sucursalId;
  },
);
