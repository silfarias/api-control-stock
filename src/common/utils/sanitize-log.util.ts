const SENSITIVE_KEYS = new Set([
  'password',
  'contrasena',
  'repeatPassword',
  'repeatpassword',
  'newPassword',
  'newpassword',
  'oldPassword',
  'oldpassword',
  'currentPassword',
  'currentpassword',
  'refresh_token',
  'refreshToken',
  'access_token',
  'accessToken',
  'authorization',
  'codigo',
  'token',
  'secret',
  'smtp_pass',
  'smtpPass',
]);

const LARGE_PAYLOAD_KEYS = new Set([
  'signature',
  'polygon',
  'base64',
  'web_image',
  'mobile_image',
  'image',
  'file',
  'attachments',
  'attachment',
  'fotoPerfil',
]);

export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > 6) {
    return '[MaxDepth]';
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item, depth + 1));
  }

  if (typeof value !== 'object') {
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(lowerKey)) {
      result[key] = '[REDACTED]';
      continue;
    }
    if (LARGE_PAYLOAD_KEYS.has(key) || LARGE_PAYLOAD_KEYS.has(lowerKey)) {
      result[key] = '[OMITTED]';
      continue;
    }
    result[key] = sanitizeForLog(val, depth + 1);
  }
  return result;
}

export function sanitizeHeaders(
  headers: Record<string, unknown>,
): Record<string, unknown> {
  return sanitizeForLog(headers) as Record<string, unknown>;
}

export function isProductionEnv(): boolean {
  return process.env.NODE_ENV === 'production';
}
