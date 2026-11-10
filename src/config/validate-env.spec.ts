import { afterEach, describe, expect, it } from 'vitest';
import { validateRequiredAuthEnv } from './validate-env.js';

const KEYS = [
  'NODE_ENV',
  'ACCESS_TOKEN_SECRET',
  'ACCESS_TOKEN_REFRESH_SECRET',
  'SEED_ADMIN_ENABLED',
  'DB_SYNCHRONIZE',
  'SKIP_AUTH_ENV_VALIDATION',
] as const;

const snapshot: Partial<Record<(typeof KEYS)[number], string | undefined>> = {};

function rememberEnv(): void {
  for (const key of KEYS) {
    snapshot[key] = process.env[key];
  }
}

function restoreEnv(): void {
  for (const key of KEYS) {
    const value = snapshot[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe('validateRequiredAuthEnv', () => {
  rememberEnv();
  afterEach(() => {
    restoreEnv();
  });

  it('rechaza secretos JWT idénticos', () => {
    process.env.SKIP_AUTH_ENV_VALIDATION = 'false';
    process.env.NODE_ENV = 'development';
    process.env.ACCESS_TOKEN_SECRET = 'mismo-secreto-123456';
    process.env.ACCESS_TOKEN_REFRESH_SECRET = 'mismo-secreto-123456';
    process.env.SEED_ADMIN_ENABLED = 'false';

    expect(() => validateRequiredAuthEnv()).toThrow(/distintos/i);
  });

  it('rechaza SEED_ADMIN_ENABLED=true en production', () => {
    process.env.SKIP_AUTH_ENV_VALIDATION = 'false';
    process.env.NODE_ENV = 'production';
    process.env.ACCESS_TOKEN_SECRET = 'access-secret-123456';
    process.env.ACCESS_TOKEN_REFRESH_SECRET = 'refresh-secret-123456';
    process.env.SEED_ADMIN_ENABLED = 'true';

    expect(() => validateRequiredAuthEnv()).toThrow(/SEED_ADMIN_ENABLED/i);
  });

  it('rechaza DB_SYNCHRONIZE=true en production', () => {
    process.env.SKIP_AUTH_ENV_VALIDATION = 'false';
    process.env.NODE_ENV = 'production';
    process.env.ACCESS_TOKEN_SECRET = 'access-secret-123456';
    process.env.ACCESS_TOKEN_REFRESH_SECRET = 'refresh-secret-123456';
    process.env.SEED_ADMIN_ENABLED = 'false';
    process.env.DB_SYNCHRONIZE = 'true';

    expect(() => validateRequiredAuthEnv()).toThrow(/DB_SYNCHRONIZE/i);
  });

  it('acepta configuración válida de desarrollo', () => {
    process.env.SKIP_AUTH_ENV_VALIDATION = 'false';
    process.env.NODE_ENV = 'development';
    process.env.ACCESS_TOKEN_SECRET = 'access-secret-123456';
    process.env.ACCESS_TOKEN_REFRESH_SECRET = 'refresh-secret-123456';
    process.env.SEED_ADMIN_ENABLED = 'true';
    process.env.DB_SYNCHRONIZE = 'false';

    expect(() => validateRequiredAuthEnv()).not.toThrow();
  });
});
