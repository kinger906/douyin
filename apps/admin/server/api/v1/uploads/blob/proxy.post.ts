import { put } from '@vercel/blob';
import { AppError, ErrorCode } from '@douyin/shared';
import { defineEventHandler, readMultipartFormData } from 'h3';
import { requireUser } from '~/server/utils/auth';
import { sendAppError } from '~/server/utils/errors';
import { useAppRuntimeConfig } from '~/server/utils/runtime-config';

function readTextPart(data: Buffer) {
  return data.toString('utf8').trim();
}

function assertAllowedPathname(pathname: string, userId: string) {
  const allowed = [`videos/${userId}/`, `covers/${userId}/`, `avatars/${userId}/`];
  if (!allowed.some((prefix) => pathname.startsWith(prefix))) {
    throw new AppError(ErrorCode.AUTH_FORBIDDEN, 'Upload pathname does not belong to the current user', 403);
  }
}

function defaultContentType(pathname: string) {
  if (pathname.startsWith('videos/')) return 'video/mp4';
  return 'image/jpeg';
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireUser(event);
    const { blobToken } = useAppRuntimeConfig();
    if (!blobToken) {
      throw new AppError(ErrorCode.INTERNAL, 'Blob uploads are not configured for this environment', 500);
    }

    const parts = await readMultipartFormData(event);
    const pathname = readTextPart(parts?.find((part) => part.name === 'pathname')?.data ?? Buffer.alloc(0));
    const file = parts?.find((part) => part.name === 'file' && part.filename);

    if (!pathname) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, 'Upload pathname is required', 400);
    }

    assertAllowedPathname(pathname, user.id);

    if (!file?.data?.length) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, 'Upload file is required', 400);
    }

    return await put(pathname, file.data, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.type || defaultContentType(pathname),
      token: blobToken,
    });
  } catch (err) {
    return sendAppError(event, err);
  }
});
