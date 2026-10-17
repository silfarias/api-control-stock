/**
 * Lectura centralizada de secretos JWT. Sin fallbacks en código:
 * deben existir en `.env` (ver `.env.example`).
 */

const MIN_SECRET_LENGTH = 16;

function assertMinLength(name: string, value: string): void {
  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `${name} debe tener al menos ${MIN_SECRET_LENGTH} caracteres (valor seguro).`,
    );
  }
}

export function getAccessTokenSecret(): string {
  const v = process.env.ACCESS_TOKEN_SECRET?.trim();
  if (!v) {
    throw new Error('ACCESS_TOKEN_SECRET no está definido (ver .env.example).');
  }
  assertMinLength('ACCESS_TOKEN_SECRET', v);
  return v;
}

export function getRefreshTokenSecret(): string {
  const v = process.env.ACCESS_TOKEN_REFRESH_SECRET?.trim();
  if (!v) {
    throw new Error(
      'ACCESS_TOKEN_REFRESH_SECRET no está definido (ver .env.example).',
    );
  }
  assertMinLength('ACCESS_TOKEN_REFRESH_SECRET', v);
  return v;
}

export function getJwtSecret(): string | undefined {
  const v = process.env.JWT_SECRET?.trim();
  return v || undefined;
}
