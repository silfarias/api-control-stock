import { createHash, randomUUID } from 'node:crypto';

/** Hash SHA-256 hex del refresh token (nunca persistir el token en claro). */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function newSessionId(): string {
  return randomUUID();
}

/** Normaliza Date o string MySQL (dateStrings: true) a Date. */
export function toDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  // "YYYY-MM-DD HH:mm:ss" → ISO local parseable
  const normalized = String(value).includes('T')
    ? String(value)
    : String(value).replace(' ', 'T');
  return new Date(normalized);
}

/** Interpreta expiraciones tipo "15m", "1h", "7d", "30d" a Date desde ahora. */
export function expiresAtFromDuration(duration: string, from = new Date()): Date {
  const match = /^(\d+)([smhd])$/i.exec(duration.trim());
  if (!match) {
    // Fallback seguro: 30 días
    return new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);
  }
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const ms =
    unit === 's'
      ? amount * 1000
      : unit === 'm'
        ? amount * 60 * 1000
        : unit === 'h'
          ? amount * 60 * 60 * 1000
          : amount * 24 * 60 * 60 * 1000;
  return new Date(from.getTime() + ms);
}
