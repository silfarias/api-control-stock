import { describe, expect, it } from 'vitest';
import {
  expiresAtFromDuration,
  hashRefreshToken,
  newSessionId,
} from './token-crypto.js';

describe('token-crypto', () => {
  it('hashRefreshToken es determinista y de 64 hex', () => {
    const a = hashRefreshToken('refresh-abc');
    const b = hashRefreshToken('refresh-abc');
    const c = hashRefreshToken('refresh-xyz');
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    expect(a).not.toBe(c);
  });

  it('newSessionId genera UUIDs distintos', () => {
    expect(newSessionId()).not.toBe(newSessionId());
  });

  it('expiresAtFromDuration interpreta 15m', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    const exp = expiresAtFromDuration('15m', from);
    expect(exp.toISOString()).toBe('2026-01-01T00:15:00.000Z');
  });
});
