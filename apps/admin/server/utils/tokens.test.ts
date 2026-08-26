import { describe, expect, it } from 'vitest';
import { createRefreshTokenValue, hashRefreshToken } from './tokens';

describe('refresh token hashing', () => {
  it('hashes deterministically for same input', async () => {
    const { token } = createRefreshTokenValue();
    const a = await hashRefreshToken(token);
    const b = await hashRefreshToken(token);
    expect(a).toBe(b);
  });
});
