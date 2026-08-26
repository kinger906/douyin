import { describe, expect, it } from 'vitest';
import { registerBodySchema } from './auth';

describe('registerBodySchema', () => {
  it('accepts valid email registration', () => {
    const parsed = registerBodySchema.parse({
      email: 'a@b.com',
      password: 'Password1',
      displayName: 'Ada',
    });
    expect(parsed.email).toBe('a@b.com');
  });

  it('rejects short password', () => {
    expect(() =>
      registerBodySchema.parse({ email: 'a@b.com', password: 'short', displayName: 'Ada' }),
    ).toThrow();
  });
});
