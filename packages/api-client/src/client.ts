import type {
  CreateCommentBody,
  CreateVideoBody,
  LoginBody,
  RegisterBody,
} from '@douyin/shared';
import type { ErrorCode } from '@douyin/shared';
import type {
  AnalyticsSummary,
  AuthSuccessResponse,
  CommentRecord,
  CommentsResponse,
  CreateApiClientOptions,
  FeedResponse,
  LikeResponse,
  LogoutResponse,
  ModerationActionResponse,
  ModerationListResponse,
  UnlikeResponse,
  VideoRecord,
  MeProfile,
  MyVideosResponse,
  SavedVideosResponse,
  FavoriteResponse,
  FollowResponse,
  FollowingResponse,
  InboxResponse,
} from './types';

export class ApiClientError extends Error {
  constructor(
    public readonly code: ErrorCode | string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
};

export function createApiClient(options: CreateApiClientOptions) {
  const apiBase = `${options.baseUrl.replace(/\/$/, '')}/api/v1`;

  async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = {};

    if (init.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (options.getAccessToken) {
      const token = await options.getAccessToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const url = new URL(`${apiBase}${path}`);
    if (init.query) {
      for (const [key, value] of Object.entries(init.query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const response = await fetch(url, {
      method: init.method ?? 'GET',
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });

    if (response.status < 200 || response.status >= 300) {
      let payload: { error?: { code?: string; message?: string } } | null = null;
      try {
        payload = (await response.json()) as { error?: { code?: string; message?: string } };
      } catch {
        // ignore parse errors
      }

      throw new ApiClientError(
        payload?.error?.code ?? 'INTERNAL',
        payload?.error?.message ?? response.statusText,
        response.status,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  return {
    register(body: RegisterBody) {
      return request<AuthSuccessResponse>('/auth/register', { method: 'POST', body });
    },

    login(body: LoginBody) {
      return request<AuthSuccessResponse>('/auth/login', { method: 'POST', body });
    },

    refresh(refreshToken?: string) {
      return request<AuthSuccessResponse>('/auth/refresh', {
        method: 'POST',
        body: refreshToken ? { refreshToken } : {},
      });
    },

    logout(refreshToken?: string) {
      return request<LogoutResponse>('/auth/logout', {
        method: 'POST',
        body: refreshToken ? { refreshToken } : {},
      });
    },

    createVideo(body: CreateVideoBody) {
      return request<VideoRecord>('/videos', { method: 'POST', body });
    },

    getFeed(cursor?: string) {
      return request<FeedResponse>('/feed', { query: { cursor } });
    },

    getMe() {
      return request<MeProfile>('/me');
    },

    updateMe(body: { displayName?: string; avatarUrl?: string | null }) {
      return request<MeProfile>('/me', { method: 'PATCH', body });
    },

    getMyVideos(status?: string) {
      return request<MyVideosResponse>('/me/videos', { query: { status } });
    },

    getMyLikes() {
      return request<SavedVideosResponse>('/me/likes');
    },

    getMyFavorites() {
      return request<SavedVideosResponse>('/me/favorites');
    },

    getFollowing() {
      return request<FollowingResponse>('/me/following');
    },

    getInbox() {
      return request<InboxResponse>('/me/inbox');
    },

    getFriendsFeed(cursor?: string) {
      return request<FeedResponse>('/feed/friends', { query: { cursor } });
    },

    like(videoId: string) {
      return request<LikeResponse>(`/videos/${videoId}/like`, { method: 'POST' });
    },

    unlike(videoId: string) {
      return request<UnlikeResponse>(`/videos/${videoId}/like`, { method: 'DELETE' });
    },

    favorite(videoId: string) {
      return request<FavoriteResponse>(`/videos/${videoId}/favorite`, { method: 'POST' });
    },

    unfavorite(videoId: string) {
      return request<FavoriteResponse>(`/videos/${videoId}/favorite`, { method: 'DELETE' });
    },

    follow(userId: string) {
      return request<FollowResponse>(`/users/${userId}/follow`, { method: 'POST' });
    },

    unfollow(userId: string) {
      return request<FollowResponse>(`/users/${userId}/follow`, { method: 'DELETE' });
    },

    listComments(videoId: string) {
      return request<CommentsResponse>(`/videos/${videoId}/comments`);
    },

    createComment(videoId: string, body: CreateCommentBody) {
      return request<CommentRecord>(`/videos/${videoId}/comments`, { method: 'POST', body });
    },

    adminListModeration(limit?: number) {
      return request<ModerationListResponse>('/admin/moderation/videos', { query: { limit } });
    },

    adminApprove(videoId: string, body: { reason?: string } = {}) {
      return request<ModerationActionResponse>(`/admin/moderation/videos/${videoId}/approve`, {
        method: 'POST',
        body,
      });
    },

    adminReject(videoId: string, body: { reason?: string } = {}) {
      return request<ModerationActionResponse>(`/admin/moderation/videos/${videoId}/reject`, {
        method: 'POST',
        body,
      });
    },

    adminAnalytics() {
      return request<AnalyticsSummary>('/admin/analytics/summary');
    },
  };
}
