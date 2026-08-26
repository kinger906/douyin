import { videos } from '@douyin/db';
import { AppError, ErrorCode } from '@douyin/shared';
import { eq } from 'drizzle-orm';
import { getCookie, getHeader, getRouterParam, type H3Event } from 'h3';
import { z } from 'zod';
import { requireUser, type AuthUser } from './auth';
import { useDb } from './db';

const videoIdParamSchema = z.string().uuid('Invalid video id');

export function readVideoIdParam(event: H3Event): string {
  const parsedVideoId = videoIdParamSchema.safeParse(getRouterParam(event, 'id'));
  if (!parsedVideoId.success) {
    throw new AppError(
      ErrorCode.VALIDATION_FAILED,
      parsedVideoId.error.issues[0]?.message ?? 'Invalid video id',
      400,
    );
  }

  return parsedVideoId.data;
}

export async function getOptionalUser(event: H3Event): Promise<AuthUser | null> {
  const hasAuthHint = Boolean(
    getHeader(event, 'authorization') || getCookie(event, 'access_token') || getCookie(event, 'refresh_token'),
  );

  if (!hasAuthHint) {
    return null;
  }

  return requireUser(event);
}

export async function requireApprovedVideo(videoId: string) {
  const [video] = await useDb()
    .select({
      id: videos.id,
      authorId: videos.authorId,
      status: videos.status,
    })
    .from(videos)
    .where(eq(videos.id, videoId))
    .limit(1);

  if (!video || video.status !== 'approved') {
    throw new AppError(ErrorCode.VIDEO_NOT_FOUND, 'Video not found', 404);
  }

  return video;
}
