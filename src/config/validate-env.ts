/**
 * Fail-fast al arrancar si faltan variables críticas de autenticación
 * o hay una configuración insegura para producción.
 * En tests se omite con NODE_ENV=test o SKIP_AUTH_ENV_VALIDATION=true.
 */

const MIN_SECRET_LENGTH = 16;

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

  const missing: string[] = [];
  for (const key of [
    'ACCESS_TOKEN_SECRET',
    'ACCESS_TOKEN_REFRESH_SECRET',
  ] as const) {
    if (!process.env[key]?.trim()) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Variables de entorno faltantes: ${missing.join(', ')}. Copiá .env.example a .env y completá valores seguros.`,
    );
  }

  const access = process.env.ACCESS_TOKEN_SECRET!.trim();
  const refresh = process.env.ACCESS_TOKEN_REFRESH_SECRET!.trim();

  for (const [key, value] of [
    ['ACCESS_TOKEN_SECRET', access],
    ['ACCESS_TOKEN_REFRESH_SECRET', refresh],
  ] as const) {
    if (value.length < MIN_SECRET_LENGTH) {
      throw new Error(`${key} debe tener al menos ${MIN_SECRET_LENGTH} caracteres.`);
    }
  }

  if (access === refresh) {
    throw new Error(
      'ACCESS_TOKEN_SECRET y ACCESS_TOKEN_REFRESH_SECRET deben ser distintos.',
    );
  }

  // Evita exponer seed-admin por un .env de producción mal copiado.
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.SEED_ADMIN_ENABLED === 'true'
  ) {
    throw new Error(
      'SEED_ADMIN_ENABLED=true no está permitido con NODE_ENV=production. Desactivá el seed en producción.',
    );
  }

  // schema:sync / synchronize no es mecanismo de producción.
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.DB_SYNCHRONIZE === 'true'
  ) {
    throw new Error(
      'DB_SYNCHRONIZE=true no está permitido con NODE_ENV=production. Usá migraciones (yarn migration:run).',
    );
  }
}
