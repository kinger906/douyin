import { describe, expect, it } from 'vitest';
import { AppError, ErrorCode } from './errors';

describe('AppError', () => {
  it('carries code and status', () => {
    const err = new AppError(ErrorCode.AUTH_INVALID, 'Invalid credentials', 401);
    expect(err.code).toBe('AUTH_INVALID');
    expect(err.status).toBe(401);
    expect(err.message).toBe('Invalid credentials');
  });
});
