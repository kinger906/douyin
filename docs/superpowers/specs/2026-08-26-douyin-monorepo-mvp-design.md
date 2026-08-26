# Douyin-like Monorepo MVP — Design Spec

**Date:** 2026-08-26  
**Status:** Approved for implementation planning  
**Scope:** Vertical-slice MVP scaffold (not a full product clone)

## 1. Goals and non-goals

### Goals

Deliver a runnable monorepo that teams can extend, with one end-to-end vertical slice:

1. Register / login (JWT + refresh)
2. Upload short video to Vercel Blob
3. Video lands in moderation as `pending`
4. Admin approves → appears in mobile Feed
5. Like + comment on approved videos

Also deliver: shared packages, CI, docs, Cursor rules/skills, and pluggable module stubs for future live/shop/notifications.

### Non-goals (this iteration)

- Full recommendation ranking
- Live streaming ingest/playback
- Payments / e-commerce checkout
- App Store / Play Store release pipelines
- Production Sentry (hook reserved only)
- Separate standalone API service

## 2. Decisions (locked)

| Topic | Choice |
| --- | --- |
| Delivery scope | Vertical-slice MVP |
| Architecture | Shared kernel + dual apps |
| API | Nuxt/Nitro unified `/api/v1` |
| Auth | Custom JWT access + refresh tokens |
| ORM / DB | Drizzle + Neon Postgres |
| Monorepo | pnpm workspaces + Turborepo |
| Mobile | Expo + React Native |
| Admin | Nuxt 3 + Vue 3 + Vite SSR |
| Media | Vercel Blob |
| Deploy | Vercel for Admin/API |

## 3. Repository structure

```
douyin/
├── apps/
│   ├── mobile/                 # Expo RN app
│   └── admin/                  # Nuxt SSR admin + Nitro API
├── packages/
│   ├── db/                     # Drizzle schema, migrations, Neon client
│   ├── shared/                 # Types, zod schemas, constants, error codes
│   ├── api-client/             # Typed HTTP client for mobile + admin UI
│   ├── config/                 # ESLint, TS, Prettier shared configs
│   ├── ui/                     # Design tokens / shared presentation contracts
│   └── modules/
│       ├── live/               # Stub interfaces + feature flag
│       ├── shop/               # Stub interfaces + feature flag
│       └── notifications/      # Push provider interface (Noop default)
├── tooling/                    # Seed scripts, codegen helpers
├── .github/workflows/          # lint, test, build, deploy
├── .cursor/rules/              # Agent conventions
├── .cursor/skills/             # Project skills for common workflows
├── docs/                       # architecture, api, database, deployment, prompts
├── turbo.json
├── pnpm-workspace.yaml
├── AGENTS.md
└── README.md
```

### Boundary rules

- Only `apps/admin` (Nitro) talks to Neon via `packages/db`.
- Mobile never holds database credentials.
- External HTTP is versioned under `/api/v1/*`.
- New product capabilities prefer `packages/modules/*` + feature flags in `system_configs`.

## 4. Data model

### Tables

#### `users`

- `id` (uuid, pk)
- `email` (unique, nullable if phone used)
- `phone` (unique, nullable)
- `password_hash`
- `display_name`
- `avatar_url` (nullable)
- `role` enum: `user` | `admin`
- `status` enum: `active` | `disabled`
- `created_at`, `updated_at`

#### `refresh_tokens`

- `id` (uuid)
- `user_id` → users
- `token_hash`
- `expires_at`
- `revoked_at` (nullable)
- `created_at`

#### `videos`

- `id` (uuid)
- `author_id` → users
- `title`, `description`
- `blob_url`, `cover_url`
- `duration_ms`
- `status` enum: `pending` | `approved` | `rejected`
- `view_count` (int, default 0)
- `created_at`, `updated_at`

#### `likes`

- `user_id` + `video_id` composite unique
- `created_at`

#### `comments`

- `id` (uuid)
- `video_id` → videos
- `user_id` → users
- `body`
- `parent_id` (nullable, self-ref for replies)
- `status` enum: `visible` | `hidden`
- `created_at`, `updated_at`

#### `moderation_logs`

- `id` (uuid)
- `video_id` → videos
- `admin_id` → users
- `action` enum: `approve` | `reject`
- `reason` (nullable text)
- `created_at`

#### `system_configs`

- `key` (pk text)
- `value` (jsonb)
- `updated_at`

Used for feature flags, moderation defaults, and future module toggles.

### Reserved (documented stubs only)

- Live: `live_sessions` (not migrated in MVP)
- Shop: `products`, `orders` (not migrated in MVP)

### Video status machine

```
upload confirm → pending
pending + admin approve → approved (feed-visible)
pending + admin reject → rejected
```

No automatic re-approve path in MVP; rejected stays rejected unless manually re-queued later.

## 5. Vertical slice flows

### Auth

1. Register with email + password (phone optional field reserved).
2. Login returns short-lived access JWT + refresh token.
3. Refresh token stored hashed in DB; rotation on refresh.
4. Mobile: access/refresh in SecureStore; `Authorization: Bearer`.
5. Admin UI: httpOnly secure cookie session wrapping same token model (or cookie holding refresh + memory access). MVP may use Bearer for both if cookie wiring delays slice; prefer cookie for Admin SSR.

### Upload

1. Authenticated client requests upload credential from `/api/v1/uploads/blob`.
2. Client uploads media directly to Vercel Blob.
3. Client confirms metadata via `/api/v1/videos` → row `status=pending`.
4. Cover image optional; if missing, placeholder cover URL from config.

### Feed

1. `GET /api/v1/feed` returns only `approved` videos, cursor pagination.
2. Mobile vertical pager; preload neighbor video URLs; lazy-load covers via `expo-image`.

### Social

1. `POST /api/v1/videos/:id/like` idempotent upsert; `DELETE` unlike.
2. `POST /api/v1/videos/:id/comments` create; `GET` list visible comments.

### Moderation

1. Admin lists `pending` videos.
2. Approve/reject writes `moderation_logs` and updates `videos.status`.
3. Approved videos become feed-eligible immediately.

## 6. Application module map

### Mobile (`apps/mobile`)

| Area | Responsibility |
| --- | --- |
| auth | register, login, token refresh |
| feed | vertical playback, preload, like/comment UI |
| capture | record/pick video, upload progress |
| profile | current user + own videos |

State: Zustand for session + feed cursor; TanStack Query for server cache.

### Admin (`apps/admin`)

| Area | Responsibility |
| --- | --- |
| auth | admin login |
| moderation | pending queue, approve/reject |
| users | list/disable users |
| analytics | simple counts (users, videos by status, likes) |
| config | edit `system_configs` / feature flags |

Nitro handlers implement `/api/v1/*` and import from `packages/db` + `packages/shared`.

### Shared packages

- `db`: schema, migrations, `createDb()` for Neon
- `shared`: zod DTOs shared by API and clients
- `api-client`: fetch wrapper + typed routes
- `config`: eslint/prettier/tsconfig baselines
- `modules/*`: Provider interfaces + Noop implementations; gated by feature flags

## 7. API surface (MVP)

Prefix: `/api/v1`

**Auth:** `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`  
**Uploads:** `POST /uploads/blob` (credential)  
**Videos:** `POST /videos`, `GET /videos/:id`, `GET /feed`  
**Social:** `POST|DELETE /videos/:id/like`, `GET|POST /videos/:id/comments`  
**Admin:** `GET /admin/moderation/videos`, `POST /admin/moderation/videos/:id/approve`, `POST /admin/moderation/videos/:id/reject`, `GET /admin/users`, `PATCH /admin/users/:id`, `GET /admin/analytics/summary`, `GET|PUT /admin/config/:key`

Errors use stable codes from `packages/shared` (e.g. `AUTH_INVALID`, `VIDEO_NOT_FOUND`, `FORBIDDEN`).

## 8. Performance strategy

- Image lazy loading with `expo-image` caching.
- Video preload window: current ± 1.
- Feed pagination with cursor, not offset-heavy deep pages.
- TanStack Query stale times tuned per resource (feed short, profile longer).
- Avoid N+1 on feed by joining author fields in query layer.
- Blob direct upload to keep API off the media bytes path.

## 9. Quality, CI/CD, observability

### Tooling

- ESLint + Prettier via `packages/config`
- TypeScript project references / workspace packages
- Vitest for `shared` utilities and selected Nitro handler unit tests

### GitHub Actions

1. `pnpm install`
2. `pnpm lint`
3. `pnpm test`
4. `pnpm build` (admin + packages; mobile typecheck/export where feasible)

Deploy Admin/API to Vercel on main (and PR previews). Mobile store deploy out of scope.

### Observability

- Structured server logs on Nitro
- Client error-reporting adapter interface; default console; Sentry adapter stub in `modules` or `shared`

## 10. Extensibility

- Feature flags in `system_configs.value.featureFlags`
- Module contract: `isEnabled()`, optional route registrar, optional admin nav items
- Third-party slots: `PaymentProvider`, `PushProvider` with Noop defaults
- Live/shop packages ship interfaces + README only in MVP

## 11. Documentation and Cursor DX deliverables

- `README.md` — intro, setup, scripts, env
- `docs/architecture.md`
- `docs/database.md`
- `docs/api.md`
- `docs/deployment.md`
- `docs/prompts/` — templates for feed polish, live module, shop module
- `AGENTS.md` + `.cursor/rules/*` + project skills for: add module, add API endpoint, vertical-slice regression

## 12. Environment variables (expected)

```
DATABASE_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_TTL=
JWT_REFRESH_TTL=
BLOB_READ_WRITE_TOKEN=
NUXT_PUBLIC_API_BASE=
EXPO_PUBLIC_API_BASE=
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
```

## 13. Success criteria

- Fresh clone: configure env → migrate → seed → `pnpm dev` runs Admin and Mobile against API
- Vertical slice demo works without manual DB edits
- Lint/test/build pass in CI
- Docs explain how to add a pluggable module without breaking boundaries

## 14. Implementation sequencing (planning hint)

1. Monorepo skeleton (pnpm, turbo, configs)
2. `packages/db` + `shared`
3. Nitro auth + video + feed + social + moderation APIs
4. Admin UI pages for slice
5. Mobile screens for slice
6. CI, docs, Cursor assets, module stubs
7. Seed + README verification pass
