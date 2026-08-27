import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client';
import { AppError, ErrorCode } from '@douyin/shared';
import { defineEventHandler, getQuery, readBody } from 'h3';
import { requireUser } from '~/server/utils/auth';
import { sendAppError } from '~/server/utils/errors';
import { useAppRuntimeConfig } from '~/server/utils/runtime-config';

type UploadPurpose = 'video' | 'cover' | 'avatar';

const PURPOSE_CONFIG: Record<
  UploadPurpose,
  { folder: string; ext: string; contentTypes: string[] }
> = {
  video: {
    folder: 'videos',
    ext: 'mp4',
    contentTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
  },
  cover: {
    folder: 'covers',
    ext: 'jpg',
    contentTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  avatar: {
    folder: 'avatars',
    ext: 'jpg',
    contentTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
};

function parsePurpose(raw: unknown): UploadPurpose {
  if (raw === 'cover' || raw === 'avatar' || raw === 'video') return raw;
  return 'video';
}

export default defineEventHandler(async (event) => {
  try {
    const user = await requireUser(event);
    const query = getQuery(event);
    let purpose = parsePurpose(query.purpose);

    if (event.method !== 'GET') {
      try {
        const body = await readBody(event);
        if (body && typeof body === 'object' && 'purpose' in body) {
          purpose = parsePurpose(Reflect.get(body, 'purpose'));
        }
      } catch {
        // empty body is fine
      }
    }

    const config = PURPOSE_CONFIG[purpose];
    const pathname = `${config.folder}/${user.id}/${Date.now()}.${config.ext}`;
    const { blobToken } = useAppRuntimeConfig();

    if (!blobToken && process.env.NODE_ENV !== 'production') {
      return {
        uploadUrl: null,
        clientToken: null,
        mock: true,
        pathname,
        purpose,
        note: 'Local demo mode: create records may use any https URL when BLOB_READ_WRITE_TOKEN is missing.',
      };
    }

    if (!blobToken) {
      throw new AppError(ErrorCode.INTERNAL, 'Blob uploads are not configured for this environment', 500);
    }

    const clientToken = await generateClientTokenFromReadWriteToken({
      token: blobToken,
      pathname,
      allowedContentTypes: config.contentTypes,
      addRandomSuffix: true,
    });

    return {
      uploadUrl: null,
      clientToken,
      mock: false,
      pathname,
      purpose,
    };
  } catch (err) {
    return sendAppError(event, err);
  }
});
