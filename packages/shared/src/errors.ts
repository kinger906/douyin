export const ErrorCode = {
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VIDEO_NOT_FOUND: 'VIDEO_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
