import { comments } from '@douyin/db';
import { AppError, ErrorCode, createCommentBodySchema } from '@douyin/shared';
import { and, eq } from 'drizzle-orm';
import { defineEventHandler, readBody } from 'h3';
import { requireUser } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { sendAppError } from '~/server/utils/errors';
import { readVideoIdParam, requireApprovedVideo } from '~/server/utils/video-api';

export default defineEventHandler(async (event) => {
  try {
    const user = await requireUser(event);
    const videoId = readVideoIdParam(event);
    const parsedBody = createCommentBodySchema.safeParse(await readBody(event));

    await requireApprovedVideo(videoId);

    if (!parsedBody.success) {
      throw new AppError(
        ErrorCode.VALIDATION_FAILED,
        parsedBody.error.issues[0]?.message ?? 'Invalid request body',
        400,
      );
    }

    if (parsedBody.data.parentId) {
      const [parentComment] = await useDb()
        .select({
          id: comments.id,
          videoId: comments.videoId,
          status: comments.status,
        })
        .from(comments)
        .where(eq(comments.id, parsedBody.data.parentId))
        .limit(1);

      if (!parentComment || parentComment.videoId !== videoId || parentComment.status !== 'visible') {
        throw new AppError(ErrorCode.VALIDATION_FAILED, 'Invalid parent comment', 400);
      }
    }

    const [comment] = await useDb()
      .insert(comments)
      .values({
        videoId,
        userId: user.id,
        body: parsedBody.data.body,
        parentId: parsedBody.data.parentId,
      })
      .returning();

    return comment;
  } catch (err) {
    return sendAppError(event, err);
  }
});
