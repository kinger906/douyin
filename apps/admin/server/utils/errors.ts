import type { H3Event } from 'h3';
import { AppError, ErrorCode } from '@douyin/shared';

export function sendAppError(event: H3Event, err: unknown) {
  if (err instanceof AppError) {
    setResponseStatus(event, err.status);
    return {
      error: {
        code: err.code,
        message: err.message,
      },
    };
  }

  console.error(err);
  setResponseStatus(event, 500);
  return {
    error: {
      code: ErrorCode.INTERNAL,
      message: 'Internal server error',
    },
  };
}
