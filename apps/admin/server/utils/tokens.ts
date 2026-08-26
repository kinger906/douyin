import { createHash, randomUUID } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { useAppRuntimeConfig } from './runtime-config';

export type AccessTokenPayload = {
  sub: string;
  role: string;
};

const textEncoder = new TextEncoder();

export function parseTtl(ttl: string): number {
  const match = ttl.match(/^(\d+)(ms|s|m|h|d)$/);

  if (!match) {
    throw new Error(`Invalid TTL value: ${ttl}`);
  }

  const value = Number.parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unsupported TTL unit: ${unit}`);
  }
}

function getRequiredSecret(secret: string, envName: string) {
  if (!secret) {
    throw new Error(`${envName} is not configured`);
  }

  return textEncoder.encode(secret);
}

export function getAccessTokenExpiresIn(): number {
  return parseTtl(useAppRuntimeConfig().jwtAccessTtl);
}

function getRefreshTokenExpiresIn(): number {
  return parseTtl(useAppRuntimeConfig().jwtRefreshTtl);
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  const { jwtAccessSecret } = useAppRuntimeConfig();
  const expiresIn = getAccessTokenExpiresIn();

  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + expiresIn) / 1000))
    .sign(getRequiredSecret(jwtAccessSecret, 'JWT_ACCESS_SECRET'));
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { jwtAccessSecret } = useAppRuntimeConfig();
  const { payload } = await jwtVerify(
    token,
    getRequiredSecret(jwtAccessSecret, 'JWT_ACCESS_SECRET'),
  );

  return {
    sub: String(payload.sub ?? ''),
    role: String(payload.role ?? ''),
  };
}

export function createRefreshTokenValue() {
  return {
    token: `${randomUUID()}.${randomUUID()}`,
    expiresAt: new Date(Date.now() + getRefreshTokenExpiresIn()),
  };
}

export async function hashRefreshToken(token: string): Promise<string> {
  return createHash('sha256').update(token).digest('hex');
}

export async function signRefreshToken(): Promise<{
  token: string;
  hash: string;
  expiresAt: Date;
}> {
  const { token, expiresAt } = createRefreshTokenValue();

  return {
    token,
    hash: await hashRefreshToken(token),
    expiresAt,
  };
}
