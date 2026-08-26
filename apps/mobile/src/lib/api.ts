import type { CreateCommentBody, CreateVideoBody, LoginBody, RegisterBody } from '@douyin/shared';
import {
  ApiClientError,
  createApiClient,
  type AuthSuccessResponse,
  type CommentsResponse,
  type FeedResponse,
  type LikeResponse,
  type LogoutResponse,
  type UnlikeResponse,
  type VideoRecord,
} from '@douyin/api-client';

import { useSessionStore } from '@/store/session';

export type UploadTicket = {
  uploadUrl: string | null;
  clientToken: string | null;
  mock: boolean;
  pathname: string;
  note?: string;
};

type UploadBlobResponse = {
  url: string;
  pathname: string;
  contentType: string;
  downloadUrl: string;
};

const apiBaseUrl = (process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:3000').replace(/\/$/, '');

const authedClient = createApiClient({
  baseUrl: apiBaseUrl,
  getAccessToken: () => useSessionStore.getState().accessToken,
});

const publicClient = createApiClient({ baseUrl: apiBaseUrl });

let refreshInFlight: Promise<string | null> | null = null;

function parseErrorPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const error = Reflect.get(payload, 'error');
  if (!error || typeof error !== 'object') {
    return null;
  }

  const code = Reflect.get(error, 'code');
  const message = Reflect.get(error, 'message');
  return {
    code: typeof code === 'string' ? code : 'INTERNAL',
    message: typeof message === 'string' ? message : 'Request failed',
  };
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const session = useSessionStore.getState();
    if (!session.refreshToken) {
      await session.clearSession();
      return null;
    }

    try {
      const refreshed = await publicClient.refresh(session.refreshToken);
      await session.setSession(refreshed);
      return refreshed.accessToken;
    } catch {
      await session.clearSession();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function withAuthRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!(error instanceof ApiClientError) || error.status !== 401) {
      throw error;
    }

    const token = await refreshAccessToken();
    if (!token) {
      throw error;
    }

    return run();
  }
}

async function requestUploadTicket(): Promise<UploadTicket> {
  const accessToken = useSessionStore.getState().accessToken;
  const response = await fetch(`${apiBaseUrl}/api/v1/uploads/blob`, {
    method: 'POST',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });

  if (!response.ok) {
    const payload = parseErrorPayload(await response.json().catch(() => null));
    throw new ApiClientError(
      payload?.code ?? 'INTERNAL',
      payload?.message ?? response.statusText,
      response.status,
    );
  }

  return (await response.json()) as UploadTicket;
}

async function uploadVideoBlob(
  ticket: UploadTicket,
  asset: { uri: string; fileName?: string | null; mimeType?: string | null },
): Promise<UploadBlobResponse> {
  const accessToken = useSessionStore.getState().accessToken;
  const formData = new FormData();

  formData.append('pathname', ticket.pathname);
  formData.append(
    'file',
    {
      uri: asset.uri,
      name: asset.fileName ?? `${ticket.pathname.split('/').pop() ?? 'upload.mp4'}`,
      type: asset.mimeType ?? 'video/mp4',
    } as any,
  );

  const response = await fetch(`${apiBaseUrl}/api/v1/uploads/blob/proxy`, {
    method: 'POST',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: formData,
  });

  if (!response.ok) {
    const payload = parseErrorPayload(await response.json().catch(() => null));
    throw new ApiClientError(
      payload?.code ?? 'INTERNAL',
      payload?.message ?? response.statusText,
      response.status,
    );
  }

  return (await response.json()) as UploadBlobResponse;
}

export const mobileApi = {
  apiBaseUrl,
  async register(body: RegisterBody): Promise<AuthSuccessResponse> {
    const session = await publicClient.register(body);
    await useSessionStore.getState().setSession(session);
    return session;
  },
  async login(body: LoginBody): Promise<AuthSuccessResponse> {
    const session = await publicClient.login(body);
    await useSessionStore.getState().setSession(session);
    return session;
  },
  refreshSession() {
    return refreshAccessToken();
  },
  async logout(): Promise<LogoutResponse | null> {
    const refreshToken = useSessionStore.getState().refreshToken;
    try {
      if (!refreshToken) {
        return null;
      }

      return await authedClient.logout(refreshToken);
    } finally {
      await useSessionStore.getState().clearSession();
    }
  },
  getFeed(cursor?: string): Promise<FeedResponse> {
    return withAuthRetry(() => authedClient.getFeed(cursor));
  },
  requestUpload(): Promise<UploadTicket> {
    return withAuthRetry(() => requestUploadTicket());
  },
  uploadVideo(ticket: UploadTicket, asset: { uri: string; fileName?: string | null; mimeType?: string | null }) {
    return withAuthRetry(() => uploadVideoBlob(ticket, asset));
  },
  createVideo(body: CreateVideoBody): Promise<VideoRecord> {
    return withAuthRetry(() => authedClient.createVideo(body));
  },
  like(videoId: string): Promise<LikeResponse> {
    return withAuthRetry(() => authedClient.like(videoId));
  },
  unlike(videoId: string): Promise<UnlikeResponse> {
    return withAuthRetry(() => authedClient.unlike(videoId));
  },
  listComments(videoId: string): Promise<CommentsResponse> {
    return withAuthRetry(() => authedClient.listComments(videoId));
  },
  createComment(videoId: string, body: CreateCommentBody) {
    return withAuthRetry(() => authedClient.createComment(videoId, body));
  },
};
