import { defineEventHandler, readBody } from 'h3';
import {
  clearAdminAuthCookies,
  readRefreshToken,
  revokeRefreshToken,
} from '~/server/utils/auth';
import { sendAppError } from '~/server/utils/errors';
import { hashRefreshToken } from '~/server/utils/tokens';

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

    if (token) {
      await revokeRefreshToken(await hashRefreshToken(token));
    }

    clearAdminAuthCookies(event);
    return { ok: true };
  } catch (err) {
    return sendAppError(event, err);
  }
});
