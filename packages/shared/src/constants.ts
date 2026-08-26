export const API_PREFIX = '/api/v1';
export const USER_ROLE = { USER: 'user', ADMIN: 'admin' } as const;
export const VIDEO_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
export const USER_STATUS = { ACTIVE: 'active', DISABLED: 'disabled' } as const;
