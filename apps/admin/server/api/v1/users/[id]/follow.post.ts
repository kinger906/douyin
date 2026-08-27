import { follows, users } from '@douyin/db';
import { AppError, ErrorCode } from '@douyin/shared';
import { eq } from 'drizzle-orm';
import { defineEventHandler, getRouterParam } from 'h3';
import { requireUser } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { sendAppError } from '~/server/utils/errors';

export default defineEventHandler(async (event) => {
  try {
    const me = await requireUser(event);
    const targetId = getRouterParam(event, 'id');

    if (!targetId) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, 'User id is required', 400);
    }

    if (targetId === me.id) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, 'Cannot follow yourself', 400);
    }

    const [target] = await useDb()
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, targetId))
      .limit(1);

    if (!target) {
      throw new AppError(ErrorCode.USER_NOT_FOUND, 'User not found', 404);
    }

    await useDb()
      .insert(follows)
      .values({ followerId: me.id, followingId: targetId })
      .onConflictDoNothing();

    return { following: true };
  } catch (err) {
    return sendAppError(event, err);
  }
});
