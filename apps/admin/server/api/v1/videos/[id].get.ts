import { comments, likes, users, videos } from '@douyin/db';
import { AppError, ErrorCode, VIDEO_STATUS } from '@douyin/shared';
import { eq, sql } from 'drizzle-orm';
import { defineEventHandler } from 'h3';
import { getOptionalUser, readVideoIdParam } from '~/server/utils/video-api';
import { useDb } from '~/server/utils/db';
import { sendAppError } from '~/server/utils/errors';

export default defineEventHandler(async (event) => {
  try {
    const viewer = await getOptionalUser(event);
    const videoId = readVideoIdParam(event);

    const [video] = await useDb()
      .select({
        id: videos.id,
        title: videos.title,
        description: videos.description,
        blobUrl: videos.blobUrl,
        coverUrl: videos.coverUrl,
        durationMs: videos.durationMs,
        status: videos.status,
        createdAt: videos.createdAt,
        updatedAt: videos.updatedAt,
        authorId: users.id,
        authorDisplayName: users.displayName,
        authorAvatarUrl: users.avatarUrl,
        likeCount: sql<number>`(
          select count(*)::int
          from ${likes}
          where ${likes.videoId} = ${videos.id}
        )`,
        commentCount: sql<number>`(
          select count(*)::int
          from ${comments}
          where ${comments.videoId} = ${videos.id}
            and ${comments.status} = 'visible'
        )`,
        likedByMe: viewer
          ? sql<boolean>`exists(
              select 1
              from ${likes}
              where ${likes.videoId} = ${videos.id}
                and ${likes.userId} = ${viewer.id}::uuid
            )`
          : sql<boolean>`false`,
      })
      .from(videos)
      .leftJoin(users, eq(users.id, videos.authorId))
      .where(eq(videos.id, videoId))
      .limit(1);

    if (!video) {
      throw new AppError(ErrorCode.VIDEO_NOT_FOUND, 'Video not found', 404);
    }

    if (
      video.status !== VIDEO_STATUS.APPROVED &&
      (!viewer || (viewer.role !== 'admin' && viewer.id !== video.authorId))
    ) {
      throw new AppError(ErrorCode.VIDEO_NOT_FOUND, 'Video not found', 404);
    }

    return {
      id: video.id,
      title: video.title,
      description: video.description,
      blobUrl: video.blobUrl,
      coverUrl: video.coverUrl,
      durationMs: video.durationMs,
      status: video.status,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
      author: {
        id: video.authorId ?? '',
        displayName: video.authorDisplayName ?? 'Unknown',
        avatarUrl: video.authorAvatarUrl ?? null,
      },
      likeCount: Number(video.likeCount ?? 0),
      commentCount: Number(video.commentCount ?? 0),
      likedByMe: Boolean(video.likedByMe),
    };
  } catch (err) {
    return sendAppError(event, err);
  }
});
