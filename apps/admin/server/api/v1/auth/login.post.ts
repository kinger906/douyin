import { users } from '@douyin/db';
import { AppError, ErrorCode, USER_STATUS, loginBodySchema } from '@douyin/shared';
import { eq } from 'drizzle-orm';
import { defineEventHandler, readBody } from 'h3';
import { issueAuthTokens } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { sendAppError } from '~/server/utils/errors';
import { verifyPassword } from '~/server/utils/password';

export default defineEventHandler(async (event) => {
  try {
    const parsedBody = loginBodySchema.safeParse(await readBody(event));
    if (!parsedBody.success) {
      throw new AppError(
        ErrorCode.VALIDATION_FAILED,
        parsedBody.error.issues[0]?.message ?? 'Invalid request body',
        400,
      );
    }

    const [user] = await useDb()
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
        status: users.status,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, parsedBody.data.email))
      .limit(1);

    if (!user || !(await verifyPassword(parsedBody.data.password, user.passwordHash))) {
      throw new AppError(ErrorCode.AUTH_INVALID, 'Invalid email or password', 401);
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      throw new AppError(ErrorCode.AUTH_FORBIDDEN, 'User account is disabled', 403);
    }

    return issueAuthTokens(event, user);
  } catch (err) {
    return sendAppError(event, err);
  }
});
