import { refreshTokens, users } from '@douyin/db';
import { AppError, ErrorCode, USER_ROLE, USER_STATUS } from '@douyin/shared';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { deleteCookie, getCookie, getHeader, setCookie, type H3Event } from 'h3';
import { useDb } from './db';
import {
  getAccessTokenExpiresIn,
  hashRefreshToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
} from './tokens';

export type AuthUser = {
  id: string;
  role: string;
};

export type AuthSessionUser = AuthUser & {
  email: string | null;
  displayName: string;
  status: string;
};

export type AuthSuccessResponse = {
  user: Pick<AuthSessionUser, 'id' | 'email' | 'displayName' | 'role'>;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type RefreshSession = AuthSessionUser & {
  refreshTokenId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

function unauthorized(message = 'Authentication is required') {
  return new AppError(ErrorCode.AUTH_UNAUTHORIZED, message, 401);
}

function forbidden(message = 'Admin access is required') {
  return new AppError(ErrorCode.AUTH_FORBIDDEN, message, 403);
}

function getBearerToken(event: H3Event) {
  const authorization = getHeader(event, 'authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice('Bearer '.length).trim();
  return token || null;
}

function getCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

async function tryAccessToken(token: string): Promise<AuthUser | null> {
  try {
    const payload = await verifyAccessToken(token);

    if (!payload.sub || !payload.role) {
      return null;
    }

    return {
      id: payload.sub,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

async function findUserByRefreshToken(token: string): Promise<AuthUser | null> {
  const tokenHash = await hashRefreshToken(token);
  const records = await useDb()
    .select({
      id: users.id,
      role: users.role,
      status: users.status,
    })
    .from(refreshTokens)
    .innerJoin(users, eq(refreshTokens.userId, users.id))
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const user = records[0];
  if (!user || user.status !== USER_STATUS.ACTIVE) {
    return null;
  }

  return {
    id: user.id,
    role: user.role,
  };
}

export function readRefreshToken(event: H3Event) {
  return getCookie(event, 'refresh_token') ?? null;
}

export function setAdminAuthCookies(
  event: H3Event,
  tokens: { accessToken: string; refreshToken: string; refreshTokenMaxAge: number },
) {
  setCookie(
    event,
    'access_token',
    tokens.accessToken,
    getCookieOptions(Math.floor(getAccessTokenExpiresIn() / 1000)),
  );
  setCookie(
    event,
    'refresh_token',
    tokens.refreshToken,
    getCookieOptions(tokens.refreshTokenMaxAge),
  );
}

export function clearAdminAuthCookies(event: H3Event) {
  deleteCookie(event, 'access_token', { path: '/' });
  deleteCookie(event, 'refresh_token', { path: '/' });
}

export async function issueAuthTokens(
  event: H3Event,
  user: AuthSessionUser,
): Promise<AuthSuccessResponse> {
  const accessToken = await signAccessToken({ sub: user.id, role: user.role });
  const refresh = await signRefreshToken();

  await useDb().insert(refreshTokens).values({
    userId: user.id,
    tokenHash: refresh.hash,
    expiresAt: refresh.expiresAt,
  });

  if (user.role === USER_ROLE.ADMIN) {
    setAdminAuthCookies(event, {
      accessToken,
      refreshToken: refresh.token,
      refreshTokenMaxAge: Math.floor((refresh.expiresAt.getTime() - Date.now()) / 1000),
    });
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
    accessToken,
    refreshToken: refresh.token,
    expiresIn: Math.floor(getAccessTokenExpiresIn() / 1000),
  };
}

export async function findRefreshSession(token: string): Promise<RefreshSession | null> {
  const tokenHash = await hashRefreshToken(token);
  const records = await useDb()
    .select({
      refreshTokenId: refreshTokens.id,
      tokenHash: refreshTokens.tokenHash,
      expiresAt: refreshTokens.expiresAt,
      revokedAt: refreshTokens.revokedAt,
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      status: users.status,
    })
    .from(refreshTokens)
    .innerJoin(users, eq(refreshTokens.userId, users.id))
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  return records[0] ?? null;
}

export function assertRefreshSession(session: RefreshSession | null): asserts session is RefreshSession {
  if (!session) {
    throw unauthorized('Refresh token is required');
  }

  if (session.status !== USER_STATUS.ACTIVE) {
    throw forbidden('User account is disabled');
  }

  if (session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    throw unauthorized('Refresh token is invalid or expired');
  }
}

export async function revokeRefreshToken(tokenHash: string) {
  await useDb()
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)));
}

export async function requireUser(event: H3Event): Promise<AuthUser> {
  const bearerToken = getBearerToken(event);
  if (bearerToken) {
    const user = await tryAccessToken(bearerToken);
    if (!user) {
      throw unauthorized('Access token is invalid or expired');
    }

    return user;
  }

  const accessTokenCookie = getCookie(event, 'access_token');
  if (accessTokenCookie) {
    const user = await tryAccessToken(accessTokenCookie);
    if (user) {
      return user;
    }
  }

  const refreshTokenCookie = readRefreshToken(event);
  if (refreshTokenCookie) {
    const user = await findUserByRefreshToken(refreshTokenCookie);
    if (user) {
      return user;
    }
  }

  throw unauthorized();
}

export async function requireAdmin(event: H3Event): Promise<AuthUser & { role: 'admin' }> {
  const user = await requireUser(event);

  if (user.role !== 'admin') {
    throw forbidden();
  }

  return { ...user, role: 'admin' };
}
