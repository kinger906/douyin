# Douyin Monorepo MVP

[![CI](https://github.com/<owner>/<repo>/actions/workflows/ci.yml/badge.svg)](https://github.com/<owner>/<repo>/actions/workflows/ci.yml)

A pnpm monorepo for a Douyin-like vertical-slice MVP:

- `apps/admin`: Nuxt 3 admin UI plus Nitro `/api/v1`
- `apps/mobile`: Expo mobile app
- `packages/db`: Drizzle schema for Neon Postgres
- `packages/shared`: shared Zod schemas, constants, and error codes
- `packages/api-client`: typed client used by mobile and admin-facing code
- `packages/modules/*`: stubbed live, shop, and notifications modules

## Stack

- Nuxt 3 + Nitro
- Expo + React Native
- Drizzle ORM + Neon Postgres
- Vercel Blob
- pnpm workspaces + Turborepo
- Vitest + ESLint + TypeScript

## Prerequisites

- Node.js 20+
- pnpm 9+
- A Postgres database URL for local migrations and seed data
- Optional: Vercel Blob read/write token for real uploads

## Quick Start

Install dependencies:

```bash
pnpm install
```

Create the root env file:

```bash
cp .env.example .env
```

If you are using PowerShell instead of a POSIX shell:

```powershell
Copy-Item .env.example .env
```

Set the mobile API base in `apps/mobile/.env`:

```dotenv
EXPO_PUBLIC_API_BASE=http://localhost:3000
```

Run the database migration and seed the admin account:

```bash
pnpm db:migrate
pnpm db:seed
```

Start the workspace:

```bash
pnpm dev
```

This starts the Nuxt admin/API app and the Expo mobile app in parallel.

## Environment Variables

The root `.env.example` includes every variable used by the MVP:

```dotenv
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
BLOB_READ_WRITE_TOKEN=
NUXT_PUBLIC_API_BASE=http://localhost:3000
EXPO_PUBLIC_API_BASE=http://localhost:3000
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=Admin123!
```

Notes:

- `DATABASE_URL` is required for local migrations, seed, and any API path that touches the database.
- `BLOB_READ_WRITE_TOKEN` is optional in local development. Without it, `POST /api/v1/uploads/blob` returns a mock upload ticket so you can still demo the vertical slice with a placeholder HTTPS video URL.
- When `BLOB_READ_WRITE_TOKEN` is configured, the mobile app uploads the picked video through `POST /api/v1/uploads/blob/proxy` before creating the pending video record.

## Useful Commands

```bash
pnpm dev
pnpm lint
pnpm test
pnpm typecheck
pnpm --filter @douyin/admin build
pnpm db:migrate
pnpm db:seed
```

## Vertical Slice Demo

The happy path is:

1. Register a creator account.
2. Request an upload ticket.
3. Create a video record, which starts in `pending`.
4. Log in as the seeded admin and approve the video.
5. Load the public feed and verify the approved video appears.

Use `curl.exe` on Windows PowerShell. On macOS/Linux, plain `curl` works.

Health check:

```powershell
curl.exe http://localhost:3000/api/v1/health
```

Register a user:

```powershell
curl.exe -X POST http://localhost:3000/api/v1/auth/register `
  -H "content-type: application/json" `
  -d "{\"email\":\"creator@example.com\",\"password\":\"Password1\",\"displayName\":\"Creator\"}"
```

Request an upload ticket with the user access token copied from the register response:

```powershell
curl.exe -X POST http://localhost:3000/api/v1/uploads/blob `
  -H "Authorization: Bearer <USER_ACCESS_TOKEN>"
```

If Blob is not configured locally, create the pending video with any HTTPS URL:

```powershell
curl.exe -X POST http://localhost:3000/api/v1/videos `
  -H "content-type: application/json" `
  -H "Authorization: Bearer <USER_ACCESS_TOKEN>" `
  -d "{\"title\":\"Demo video\",\"description\":\"Seeded from local demo\",\"blobUrl\":\"https://example.com/demo.mp4\",\"coverUrl\":\"https://example.com/demo.jpg\",\"durationMs\":12000}"
```

Log in as the seeded admin:

```powershell
curl.exe -X POST http://localhost:3000/api/v1/auth/login `
  -H "content-type: application/json" `
  -d "{\"email\":\"admin@example.com\",\"password\":\"Admin123!\"}"
```

The admin login response returns the access token in JSON and stores the refresh token only in the `refresh_token` cookie for browser refresh flows.

Approve the pending video using the admin access token and the video id from the previous response:

```powershell
curl.exe -X POST http://localhost:3000/api/v1/admin/moderation/videos/<VIDEO_ID>/approve `
  -H "content-type: application/json" `
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" `
  -d "{}"
```

Fetch the feed:

```powershell
curl.exe http://localhost:3000/api/v1/feed
```

## Repository Layout

```text
apps/
  admin/        Nuxt 3 admin UI and Nitro API
  mobile/       Expo app
packages/
  api-client/   typed HTTP client
  config/       shared lint and tsconfig baselines
  db/           Drizzle schema and Neon client
  shared/       Zod DTOs, constants, error codes
  ui/           shared design tokens
  modules/
    live/       feature-flagged live module stub
    shop/       feature-flagged shop module stub
    notifications/ feature-flagged notifications stub
tooling/
  seed.ts       seed admin user and default feature flags
```

## CI Notes

GitHub Actions runs:

- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`
- `pnpm --filter @douyin/admin build`

The CI job intentionally does not run live database migrations or Blob uploads unless repository secrets are added. Mobile verification is limited to typechecking; app-store packaging is out of scope for this MVP.

## Deferred Items

- No standalone API service; Nitro inside `apps/admin` owns `/api/v1`
- No live-streaming ingest/playback implementation
- No shop checkout or payment flow
- No app-store or Play Store release pipeline
