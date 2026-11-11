import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { JwtAuthGuard } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  const guard = new JwtAuthGuard({} as any);

  it('responde 401 sin Authorization', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('responde 401 con Bearer vacío / formato inválido', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Token abc' },
        }),
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
