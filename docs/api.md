# API

## Base URL

All public HTTP routes live under:

```text
/api/v1
```

## Auth Model

- Mobile clients send `Authorization: Bearer <accessToken>`.
- Admin login also sets `access_token` and `refresh_token` cookies for browser flows.
- Admin JSON auth responses do not expose the refresh token; browser refresh uses the `refresh_token` cookie on `/auth/refresh`.
- Refresh tokens are stored hashed in the database.
- Error responses use the shape `{ "error": { "code": "...", "message": "..." } }`.

## Endpoints

### Public

- `GET /health`: service health check
- `POST /auth/register`: create a user account and issue tokens
- `POST /auth/login`: log in and issue tokens
- `POST /auth/refresh`: rotate the refresh token and issue a new access token
- `POST /auth/logout`: revoke the refresh token

### Authenticated User

- `POST /uploads/blob`: request a Blob client token or a local mock upload ticket
- `POST /uploads/blob/proxy`: upload a picked mobile video to Vercel Blob when native client uploads cannot use the browser token flow
- `POST /videos`: create a video record in `pending`
- `GET /videos/:id`: fetch a single video; non-approved videos are only visible to the author or an admin
- `GET /feed`: list approved videos with cursor pagination
- `POST /videos/:id/like`: like an approved video
- `DELETE /videos/:id/like`: unlike an approved video
- `GET /videos/:id/comments`: list visible comments for an approved video
- `POST /videos/:id/comments`: create a comment for an approved video

### Admin

- `GET /admin/moderation/videos`: list pending videos
- `POST /admin/moderation/videos/:id/approve`: approve a pending video
- `POST /admin/moderation/videos/:id/reject`: reject a pending video
- `GET /admin/users`: list users with page and limit query params
- `PATCH /admin/users/:id`: update user role and/or status
- `GET /admin/analytics/summary`: fetch aggregate counts
- `GET /admin/config/:key`: read config values such as `featureFlags`
- `PUT /admin/config/:key`: upsert config values

Compatibility aliases currently also exist under `/api/v1/admin/videos/:id/approve` and `/api/v1/admin/videos/:id/reject`, but new work should use the `/admin/moderation/videos/*` routes.

## Common Payload Notes

- Auth registration/login uses the shared Zod schemas in `@douyin/shared`.
- Video creation expects `title`, `description`, `blobUrl`, optional `coverUrl`, and `durationMs`.
- `GET /feed` returns `{ items, nextCursor }` and only includes `approved` videos.
- `PUT /admin/config/featureFlags` validates `{ live, shop, notifications }` as booleans.

## Curl Smoke Paths

Use `curl.exe` in PowerShell or `curl` elsewhere.

Health:

```powershell
curl.exe http://localhost:3000/api/v1/health
```

Register:

```powershell
curl.exe -X POST http://localhost:3000/api/v1/auth/register `
  -H "content-type: application/json" `
  -d "{\"email\":\"creator@example.com\",\"password\":\"Password1\",\"displayName\":\"Creator\"}"
```

Feed:

```powershell
curl.exe http://localhost:3000/api/v1/feed
```

Admin approve:

```powershell
curl.exe -X POST http://localhost:3000/api/v1/admin/moderation/videos/<VIDEO_ID>/approve `
  -H "content-type: application/json" `
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" `
  -d "{}"
```
