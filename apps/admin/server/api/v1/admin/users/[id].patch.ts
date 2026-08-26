import { users } from '@douyin/db';
import { AppError, ErrorCode, updateUserBodySchema } from '@douyin/shared';
import { eq } from 'drizzle-orm';
import { defineEventHandler, getRouterParam, readBody } from 'h3';
import { z } from 'zod';
import { requireAdmin } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { sendAppError } from '~/server/utils/errors';

const userIdParamSchema = z.string().uuid('Invalid user id');

export default defineEventHandler(async (event) => {
  try {
    await requireAdmin(event);

    const parsedUserId = userIdParamSchema.safeParse(getRouterParam(event, 'id'));
    if (!parsedUserId.success) {
      throw new AppError(
        ErrorCode.VALIDATION_FAILED,
        parsedUserId.error.issues[0]?.message ?? 'Invalid user id',
        400,
      );
    }

    const parsedBody = updateUserBodySchema.safeParse(await readBody(event));
    if (!parsedBody.success) {
      throw new AppError(
        ErrorCode.VALIDATION_FAILED,
        parsedBody.error.issues[0]?.message ?? 'Invalid request body',
        400,
      );
    }

    if (!parsedBody.data.role && !parsedBody.data.status) {
      throw new AppError(
        ErrorCode.VALIDATION_FAILED,
        'At least one of role or status is required',
        400,
      );
    }

    const [updatedUser] = await useDb()
      .update(users)
      .set({
        ...parsedBody.data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, parsedUserId.data))
      .returning({
        id: users.id,
        email: users.email,
        phone: users.phone,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    if (!updatedUser) {
      throw new AppError(ErrorCode.USER_NOT_FOUND, 'User not found', 404);
    }

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      phone: updatedUser.phone,
      displayName: updatedUser.displayName,
      avatarUrl: updatedUser.avatarUrl,
      role: updatedUser.role,
      status: updatedUser.status,
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString(),
    };
  } catch (err) {
    return sendAppError(event, err);
  }
});
