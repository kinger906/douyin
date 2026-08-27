import { follows } from '@douyin/db';
import { AppError, ErrorCode } from '@douyin/shared';
import { and, eq } from 'drizzle-orm';
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

    await useDb()
      .delete(follows)
      .where(and(eq(follows.followerId, me.id), eq(follows.followingId, targetId)));

    return { following: false };
  } catch (err) {
    return sendAppError(event, err);
  }
});
