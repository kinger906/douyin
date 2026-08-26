import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client';
import { defineEventHandler } from 'h3';
import { requireUser } from '~/server/utils/auth';
import { sendAppError } from '~/server/utils/errors';
import { useAppRuntimeConfig } from '~/server/utils/runtime-config';

export default defineEventHandler(async (event) => {
  try {
    const user = await requireUser(event);
    const { blobToken } = useAppRuntimeConfig();
    const pathname = `videos/${user.id}/${Date.now()}.mp4`;

    if (!blobToken && process.env.NODE_ENV !== 'production') {
      return {
        uploadUrl: null,
        clientToken: null,
        mock: true,
        pathname,
        note: 'Local demo mode: create video may use any https blobUrl when BLOB_READ_WRITE_TOKEN is missing.',
      };
    }

    const clientToken = await generateClientTokenFromReadWriteToken({
      token: blobToken,
      pathname,
      allowedContentTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
      addRandomSuffix: true,
    });

    return {
      uploadUrl: null,
      clientToken,
      mock: false,
      pathname,
    };
  } catch (err) {
    return sendAppError(event, err);
  }
});
