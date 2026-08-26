import { videos } from '@douyin/db';
import { AppError, ErrorCode, VIDEO_STATUS, createVideoBodySchema } from '@douyin/shared';
import { defineEventHandler, readBody } from 'h3';
import { requireUser } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { sendAppError } from '~/server/utils/errors';

export default defineEventHandler(async (event) => {
  try {
    const user = await requireUser(event);
    const parsedBody = createVideoBodySchema.safeParse(await readBody(event));

    if (!parsedBody.success) {
      throw new AppError(
        ErrorCode.VALIDATION_FAILED,
        parsedBody.error.issues[0]?.message ?? 'Invalid request body',
        400,
      );
    }

    const [video] = await useDb()
      .insert(videos)
      .values({
        authorId: user.id,
        title: parsedBody.data.title,
        description: parsedBody.data.description,
        blobUrl: parsedBody.data.blobUrl,
        coverUrl: parsedBody.data.coverUrl,
        durationMs: parsedBody.data.durationMs,
        status: VIDEO_STATUS.PENDING,
      })
      .returning();

    return video;
  } catch (err) {
    return sendAppError(event, err);
  }
});
