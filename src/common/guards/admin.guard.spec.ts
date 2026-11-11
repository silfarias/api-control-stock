import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { UsuarioRole } from '../enums/usuario-role.enum.js';
import { AdminGuard } from './admin.guard.js';

function buildContext(user?: { id?: number; role?: UsuarioRole }): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as ExecutionContext;
}

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  it('permite ADMIN', () => {
    expect(
      guard.canActivate(
        buildContext({ id: 1, role: UsuarioRole.ADMIN }),
      ),
    ).toBe(true);
  });

  it('rechaza EMPLEADO con 403', () => {
    expect(() =>
      guard.canActivate(
        buildContext({ id: 2, role: UsuarioRole.EMPLEADO }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('rechaza sin usuario con 401', () => {
    expect(() => guard.canActivate(buildContext(undefined))).toThrow(
      UnauthorizedException,
    );
  });
});
