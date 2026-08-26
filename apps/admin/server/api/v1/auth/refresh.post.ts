import { defineEventHandler, readBody } from 'h3';
import {
  assertRefreshSession,
  findRefreshSession,
  issueAuthTokens,
  readRefreshToken,
  revokeRefreshToken,
} from '~/server/utils/auth';
import { sendAppError } from '~/server/utils/errors';

function getRefreshTokenFromBody(body: unknown) {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const refreshToken = Reflect.get(body, 'refreshToken');
  return typeof refreshToken === 'string' && refreshToken ? refreshToken : null;
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const token = readRefreshToken(event) ?? getRefreshTokenFromBody(body);
    const session = await findRefreshSession(token ?? '');

    assertRefreshSession(session);
    await revokeRefreshToken(session.tokenHash);

    return issueAuthTokens(event, {
      id: session.id,
      email: session.email,
      displayName: session.displayName,
      role: session.role,
      status: session.status,
    });
  } catch (err) {
    return sendAppError(event, err);
  }
});
