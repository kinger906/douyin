import type { H3Event } from 'h3';
import { AppError, ErrorCode } from '@douyin/shared';

export type AuthUser = {
  id: string;
  role: string;
};

export async function requireUser(_event: H3Event): Promise<AuthUser> {
  throw new AppError(
    ErrorCode.AUTH_UNAUTHORIZED,
    'Authentication is not implemented yet',
    401,
  );
}

export async function requireAdmin(event: H3Event): Promise<AuthUser & { role: 'admin' }> {
  const user = await requireUser(event);

  if (user.role !== 'admin') {
    throw new AppError(
      ErrorCode.AUTH_FORBIDDEN,
      'Admin access is required',
      403,
    );
  }

  return { ...user, role: 'admin' };
}
