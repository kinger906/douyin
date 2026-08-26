import { beforeEach, describe, expect, it, vi } from 'vitest';
import { USER_ROLE, USER_STATUS } from '@douyin/shared';

const {
  deleteCookieMock,
  getCookieMock,
  getHeaderMock,
  insertMock,
  insertValuesMock,
  setCookieMock,
  signAccessTokenMock,
  signRefreshTokenMock,
  useDbMock,
  verifyAccessTokenMock,
} = vi.hoisted(() => ({
  deleteCookieMock: vi.fn(),
  getCookieMock: vi.fn<(event: any, name: string) => string | null>(),
  getHeaderMock: vi.fn<(event: any, name: string) => string | null>(),
  insertValuesMock: vi.fn(),
  insertMock: vi.fn(),
  setCookieMock: vi.fn(),
  signAccessTokenMock: vi.fn(async () => 'signed-access'),
  signRefreshTokenMock: vi.fn(async () => ({
    token: 'signed-refresh',
    hash: 'hashed-refresh',
    expiresAt: new Date('2030-01-01T00:00:00.000Z'),
  })),
  useDbMock: vi.fn(),
  verifyAccessTokenMock: vi.fn(),
}));

vi.mock('h3', () => ({
  deleteCookie: deleteCookieMock,
  getCookie: getCookieMock,
  getHeader: getHeaderMock,
  setCookie: setCookieMock,
}));

vi.mock('@douyin/db', () => ({
  refreshTokens: {},
  users: {},
}));

vi.mock('./db', () => ({
  useDb: useDbMock,
}));

vi.mock('./tokens', () => ({
  getAccessTokenExpiresIn: () => 15 * 60 * 1000,
  hashRefreshToken: vi.fn(),
  signAccessToken: signAccessTokenMock,
  signRefreshToken: signRefreshTokenMock,
  verifyAccessToken: verifyAccessTokenMock,
}));

import { issueAuthTokens, requireUser } from './auth';

describe('auth helpers', () => {
  beforeEach(() => {
    deleteCookieMock.mockReset();
    getCookieMock.mockReset();
    getHeaderMock.mockReset();
    insertMock.mockClear();
    insertValuesMock.mockReset();
    setCookieMock.mockReset();
    signAccessTokenMock.mockClear();
    signRefreshTokenMock.mockClear();
    verifyAccessTokenMock.mockReset();

    insertMock.mockImplementation(() => ({ values: insertValuesMock }));
    insertValuesMock.mockResolvedValue(undefined);
    getCookieMock.mockImplementation((event, name) => event.cookies?.[name] ?? null);
    getHeaderMock.mockImplementation((event, name) => event.headers?.[name] ?? null);
    useDbMock.mockImplementation(() => ({ insert: insertMock }));
  });

  it('returns null refresh token for admins and sets cookies', async () => {
    const response = await issueAuthTokens({} as any, {
      id: 'admin-1',
      email: 'admin@example.com',
      displayName: 'Admin',
      role: USER_ROLE.ADMIN,
      status: USER_STATUS.ACTIVE,
    });

    expect(response.accessToken).toBe('signed-access');
    expect(response.refreshToken).toBeNull();
    expect(setCookieMock).toHaveBeenCalledTimes(2);
    expect(setCookieMock.mock.calls.map(([, name]) => name)).toEqual(['access_token', 'refresh_token']);
  });

  it('returns refresh token for non-admin users', async () => {
    const response = await issueAuthTokens({} as any, {
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'Creator',
      role: USER_ROLE.USER,
      status: USER_STATUS.ACTIVE,
    });

    expect(response.refreshToken).toBe('signed-refresh');
    expect(setCookieMock).not.toHaveBeenCalled();
  });

  it('authenticates with an access cookie', async () => {
    verifyAccessTokenMock.mockResolvedValue({ sub: 'user-1', role: USER_ROLE.USER });

    const user = await requireUser({
      cookies: { access_token: 'cookie-access' },
      headers: {},
    } as any);

    expect(user).toEqual({ id: 'user-1', role: USER_ROLE.USER });
    expect(verifyAccessTokenMock).toHaveBeenCalledWith('cookie-access');
  });

  it('rejects refresh-cookie-only requests', async () => {
    await expect(
      requireUser({
        cookies: { refresh_token: 'refresh-only' },
        headers: {},
      } as any),
    ).rejects.toMatchObject({
      code: 'AUTH_UNAUTHORIZED',
      status: 401,
    });

    expect(verifyAccessTokenMock).not.toHaveBeenCalled();
  });
});
