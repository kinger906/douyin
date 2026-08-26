import { moderationLogs, videos } from '@douyin/db';
import { AppError, ErrorCode, VIDEO_STATUS, moderationActionBodySchema } from '@douyin/shared';
import { and, eq } from 'drizzle-orm';
import { readBody, type H3Event } from 'h3';
import { requireAdmin } from './auth';
import { useDb } from './db';
import { readVideoIdParam } from './video-api';

type ModerationAction = 'approve' | 'reject';

const nextStatusByAction = {
  approve: VIDEO_STATUS.APPROVED,
  reject: VIDEO_STATUS.REJECTED,
} as const;

const pastTenseByAction: Record<ModerationAction, string> = {
  approve: 'approved',
  reject: 'rejected',
};

export async function runModerationAction(event: H3Event, action: ModerationAction) {
  const admin = await requireAdmin(event);
  const videoId = readVideoIdParam(event);
  const parsedBody = moderationActionBodySchema.safeParse(await readBody(event));

  if (!parsedBody.success) {
    throw new AppError(
      ErrorCode.VALIDATION_FAILED,
      parsedBody.error.issues[0]?.message ?? 'Invalid request body',
      400,
    );
  }

  const [updatedVideo] = await useDb()
    .update(videos)
    .set({
      status: nextStatusByAction[action],
      updatedAt: new Date(),
    })
    .where(and(eq(videos.id, videoId), eq(videos.status, VIDEO_STATUS.PENDING)))
    .returning({
      id: videos.id,
      status: videos.status,
    });

  if (!updatedVideo) {
    const [existingVideo] = await useDb()
      .select({
        id: videos.id,
      })
      .from(videos)
      .where(eq(videos.id, videoId))
      .limit(1);

    if (!existingVideo) {
      throw new AppError(ErrorCode.VIDEO_NOT_FOUND, 'Video not found', 404);
    }

    throw new AppError(
      ErrorCode.CONFLICT,
      `Only pending videos can be ${pastTenseByAction[action]}`,
      409,
    );
  }

  await useDb().insert(moderationLogs).values({
    videoId,
    adminId: admin.id,
    action,
    reason: parsedBody.data.reason ?? null,
  });

  return updatedVideo;
}
