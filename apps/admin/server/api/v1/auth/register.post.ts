import { users } from '@douyin/db';
import { AppError, ErrorCode, registerBodySchema } from '@douyin/shared';
import { eq } from 'drizzle-orm';
import { defineEventHandler, readBody } from 'h3';
import { issueAuthTokens } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { sendAppError } from '~/server/utils/errors';
import { hashPassword } from '~/server/utils/password';

export default defineEventHandler(async (event) => {
  try {
    const parsedBody = registerBodySchema.safeParse(await readBody(event));
    if (!parsedBody.success) {
      throw new AppError(
        ErrorCode.VALIDATION_FAILED,
        parsedBody.error.issues[0]?.message ?? 'Invalid request body',
        400,
      );
    }

    const body = parsedBody.data;
    const db = useDb();

    const existingEmail = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);
    if (existingEmail[0]) {
      throw new AppError(ErrorCode.CONFLICT, 'Email is already registered', 409);
    }

    if (body.phone) {
      const existingPhone = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.phone, body.phone))
        .limit(1);
      if (existingPhone[0]) {
        throw new AppError(ErrorCode.CONFLICT, 'Phone is already registered', 409);
      }
    }

    const insertedUsers = await db
      .insert(users)
      .values({
        email: body.email,
        phone: body.phone,
        displayName: body.displayName,
        passwordHash: await hashPassword(body.password),
      })
      .returning({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
        status: users.status,
      });

    return issueAuthTokens(event, insertedUsers[0]);
  } catch (err) {
    return sendAppError(event, err);
  }
});
