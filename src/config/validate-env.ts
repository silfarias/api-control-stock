/**
 * Fail-fast al arrancar si faltan variables críticas de autenticación.
 * En tests (Jest) se omite: usar `test/setup-e2e-env.ts` para valores dummy.
 */

function shouldSkipAuthValidation(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.JEST_WORKER_ID !== undefined ||
    process.env.SKIP_AUTH_ENV_VALIDATION === 'true'
  );
}

export function validateRequiredAuthEnv(): void {
  if (shouldSkipAuthValidation()) {
    return;
  }

  // Solo tokens emitidos por esta API: longitud mínima y obligatorios.
  // JWT_SECRET (AUTH externa) es opcional y puede ser corto: lo define el proveedor, no esta plantilla.
  const missing: string[] = [];
  for (const key of ['ACCESS_TOKEN_SECRET', 'ACCESS_TOKEN_REFRESH_SECRET'] as const) {
    if (!process.env[key]?.trim()) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Variables de entorno faltantes: ${missing.join(', ')}. Copiá .env.example a .env y completá valores seguros.`,
    );
  }

  const min = 16;
  for (const key of ['ACCESS_TOKEN_SECRET', 'ACCESS_TOKEN_REFRESH_SECRET'] as const) {
    const v = process.env[key]!.trim();
    if (v.length < min) {
      throw new Error(`${key} debe tener al menos ${min} caracteres.`);
    }
  }
}