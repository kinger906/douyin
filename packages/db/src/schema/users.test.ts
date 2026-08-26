import { describe, expect, it } from 'vitest';
import { users } from './users';

describe('users table', () => {
  it('exposes expected columns', () => {
    expect(users.id).toBeDefined();
    expect(users.email).toBeDefined();
    expect(users.passwordHash).toBeDefined();
    expect(users.role).toBeDefined();
  });
});
