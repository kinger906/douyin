import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password', () => {
  it('roundtrips', async () => {
    const hash = await hashPassword('Password1');
    expect(await verifyPassword('Password1', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });
});
