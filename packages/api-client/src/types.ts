import type { ErrorCode } from '@douyin/shared';

export type ApiErrorPayload = {
  error: {
    code: ErrorCode | string;
    message: string;
  };
};

export type AuthUser = {
  id: string;
  email: string | null;
  displayName: string;
  role: string;
  avatarUrl?: string | null;
};

export type AuthSuccessResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
};

export type LogoutResponse = {
  ok: true;
};

export type FeedAuthor = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type FeedItem = {
  id: string;
  title: string;
  description: string;
  blobUrl: string;
  coverUrl: string | null;
  durationMs: number;
  author: FeedAuthor;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  favoritedByMe?: boolean;
  followedByMe?: boolean;
};

export type FeedResponse = {
  items: FeedItem[];
  nextCursor: string | null;
};

export type VideoRecord = {
  id: string;
  authorId: string;
  title: string;
  description: string;
  blobUrl: string;
  coverUrl: string | null;
  durationMs: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type LikeResponse = {
  liked: boolean;
  like: {
    userId: string;
    videoId: string;
    createdAt: string;
  } | null;
};

export type UnlikeResponse = {
  liked: false;
};

export type CommentAuthor = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type CommentRecord = {
  id: string;
  videoId: string;
  userId: string;
  body: string;
  parentId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type CommentItem = CommentRecord & {
  author: CommentAuthor;
};

export type CommentsResponse = {
  items: CommentItem[];
};

export type ModerationItem = {
  id: string;
  title: string;
  description: string;
  blobUrl: string;
  coverUrl: string | null;
  durationMs: number;
  status: string;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
  };
};

export type ModerationListResponse = {
  items: ModerationItem[];
};

export type ModerationActionResponse = {
  id: string;
  status: string;
};

export type AnalyticsSummary = {
  users: number;
  videosPending: number;
  videosApproved: number;
  videosRejected: number;
  likes: number;
  comments: number;
};

export type MeProfile = {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  douyinId: string;
  stats: {
    likesReceived: number;
    commentsReceived: number;
    works: number;
    approvedWorks: number;
    following: number;
    followers: number;
    mutualFollows: number;
  };
};

export type MyVideoItem = {
  id: string;
  title: string;
  description: string;
  blobUrl: string;
  coverUrl: string | null;
  durationMs: number;
  status: string;
  viewCount: number;
  likeCount: number;
  createdAt: string;
};

export type MyVideosResponse = {
  items: MyVideoItem[];
};

export type SavedVideoItem = MyVideoItem & {
  author?: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

export type SavedVideosResponse = {
  items: SavedVideoItem[];
};

export type FavoriteResponse = {
  favorited: boolean;
  favorite?: {
    userId: string;
    videoId: string;
    createdAt: string;
  } | null;
};

export type FollowResponse = {
  following: boolean;
};

export type FollowingUser = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  followedAt: string;
  works: number;
};

export type FollowingResponse = {
  followingCount: number;
  followerCount: number;
  items: FollowingUser[];
};

export type InboxItem = {
  id: string;
  type: 'like' | 'favorite' | 'comment' | 'follow';
  title: string;
  body: string;
  actor: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  videoId: string | null;
  createdAt: string;
};

export type InboxResponse = {
  items: InboxItem[];
};

export type CreateApiClientOptions = {
  baseUrl: string;
  getAccessToken?: () => string | null | Promise<string | null>;
};
