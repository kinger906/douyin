# Douyin Monorepo MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable pnpm+Turborepo monorepo with Expo mobile + Nuxt admin/API that completes the vertical slice: auth → Blob upload → moderation → feed → like/comment.

**Architecture:** Shared packages (`db`, `shared`, `api-client`, `config`, `modules/*`) feed a single Nitro API inside `apps/admin`. Mobile and Admin UI call `/api/v1` via `api-client`. Neon Postgres via Drizzle; media via Vercel Blob direct upload.

**Tech Stack:** pnpm workspaces, Turborepo, TypeScript, Expo, Nuxt 3, Drizzle, Neon, Vercel Blob, Vitest, ESLint, Prettier, GitHub Actions, Zustand, TanStack Query, jose/bcrypt for JWT/password.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-26-douyin-monorepo-mvp-design.md`
- Only `apps/admin` Nitro may use `DATABASE_URL` / `packages/db`
- Public HTTP only under `/api/v1/*`
- Mobile auth: Bearer access JWT; Admin: httpOnly refresh cookie + short-lived access
- Video feed returns only `status=approved`
- New uploads start as `pending`
- No live/shop/payment implementation beyond stubs
- Package manager: pnpm; Node.js >= 20
- Workspace package names use `@douyin/*` scope

---

## File map (create)

```
package.json
pnpm-workspace.yaml
turbo.json
.tsconfig.base.json
.gitignore
.env.example
README.md
AGENTS.md
apps/admin/**                     # Nuxt 3 app + server/api/v1/**
apps/mobile/**                    # Expo app
packages/config/**                # eslint, prettier, tsconfig
packages/shared/**                # errors, zod DTOs, constants
packages/db/**                    # drizzle schema, client, migrate
packages/api-client/**            # typed fetch client
packages/ui/**                    # tokens only
packages/modules/live/**
packages/modules/shop/**
packages/modules/notifications/**
tooling/seed.ts
.github/workflows/ci.yml
.cursor/rules/*.mdc
.cursor/skills/**/SKILL.md
docs/architecture.md
docs/database.md
docs/api.md
docs/deployment.md
docs/prompts/*.md
```

---

### Task 1: Monorepo skeleton + shared config

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.gitignore`, `.env.example`, `.npmrc`
- Create: `packages/config/package.json`, `packages/config/eslint.config.mjs`, `packages/config/prettier.config.mjs`, `packages/config/tsconfig.json`

**Interfaces:**
- Consumes: none
- Produces: workspace root scripts `lint`, `test`, `build`, `dev`; package `@douyin/config`

- [ ] **Step 1: Write root workspace files**

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "packages/modules/*"
  - "tooling"
```

`package.json`:
```json
{
  "name": "douyin",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "db:generate": "pnpm --filter @douyin/db generate",
    "db:migrate": "pnpm --filter @douyin/db migrate",
    "db:seed": "pnpm --filter @douyin/tooling seed",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.7.2"
  }
}
```

`turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".output/**", ".nuxt/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] },
    "typecheck": { "dependsOn": ["^build"] }
  }
}
```

`.npmrc`:
```
shamefully-hoist=true
strict-peer-dependencies=false
auto-install-peers=true
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

`.gitignore` must include: `node_modules`, `.turbo`, `.nuxt`, `.output`, `dist`, `.env`, `.env.local`, `*.log`, `.expo`, `coverage`.

`.env.example`:
```
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

- [ ] **Step 2: Create `@douyin/config`**

`packages/config/package.json`:
```json
{
  "name": "@douyin/config",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./eslint": "./eslint.config.mjs",
    "./prettier": "./prettier.config.mjs",
    "./tsconfig": "./tsconfig.json"
  },
  "devDependencies": {
    "@eslint/js": "^9.17.0",
    "eslint": "^9.17.0",
    "prettier": "^3.4.2",
    "typescript-eslint": "^8.18.0"
  }
}
```

`packages/config/prettier.config.mjs`:
```js
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
};
```

`packages/config/eslint.config.mjs`:
```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { ignores: ['**/dist/**', '**/.nuxt/**', '**/.output/**', '**/node_modules/**'] },
);
```

`packages/config/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "noEmit": true }
}
```

- [ ] **Step 3: Install and verify workspace**

Run: `pnpm install`
Expected: lockfile created; no errors.

Run: `pnpm exec turbo run build --dry-run`
Expected: turbo recognizes workspace (may show 0 packages with build until apps exist — OK if turbo starts).

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json tsconfig.base.json .gitignore .env.example .npmrc pnpm-lock.yaml packages/config
git commit -m "chore: scaffold pnpm turborepo workspace and shared config"
```

---

### Task 2: `@douyin/shared` — errors, DTOs, constants

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/vitest.config.ts`, `packages/shared/src/index.ts`, `packages/shared/src/errors.ts`, `packages/shared/src/constants.ts`, `packages/shared/src/schemas/auth.ts`, `packages/shared/src/schemas/video.ts`, `packages/shared/src/schemas/social.ts`, `packages/shared/src/schemas/admin.ts`
- Test: `packages/shared/src/errors.test.ts`, `packages/shared/src/schemas/auth.test.ts`

**Interfaces:**
- Consumes: none
- Produces:
  - `ErrorCode` const object + `AppError` class
  - Zod schemas: `registerBodySchema`, `loginBodySchema`, `createVideoBodySchema`, `createCommentBodySchema`, `moderationActionBodySchema`
  - `VIDEO_STATUS`, `USER_ROLE`, `API_PREFIX = '/api/v1'`

- [ ] **Step 1: Write failing tests**

`packages/shared/src/errors.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { AppError, ErrorCode } from './errors';

describe('AppError', () => {
  it('carries code and status', () => {
    const err = new AppError(ErrorCode.AUTH_INVALID, 'Invalid credentials', 401);
    expect(err.code).toBe('AUTH_INVALID');
    expect(err.status).toBe(401);
    expect(err.message).toBe('Invalid credentials');
  });
});
```

`packages/shared/src/schemas/auth.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { registerBodySchema } from './auth';

describe('registerBodySchema', () => {
  it('accepts valid email registration', () => {
    const parsed = registerBodySchema.parse({
      email: 'a@b.com',
      password: 'Password1',
      displayName: 'Ada',
    });
    expect(parsed.email).toBe('a@b.com');
  });

  it('rejects short password', () => {
    expect(() =>
      registerBodySchema.parse({ email: 'a@b.com', password: 'short', displayName: 'Ada' }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run tests — expect fail**

`packages/shared/package.json`:
```json
{
  "name": "@douyin/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "eslint ."
  },
  "dependencies": { "zod": "^3.24.1" },
  "devDependencies": {
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

`packages/shared/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node' } });
```

`packages/shared/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

Run: `pnpm install && pnpm --filter @douyin/shared test`
Expected: FAIL (modules not found / cannot resolve).

- [ ] **Step 3: Implement shared sources**

`packages/shared/src/errors.ts`:
```ts
export const ErrorCode = {
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VIDEO_NOT_FOUND: 'VIDEO_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

`packages/shared/src/constants.ts`:
```ts
export const API_PREFIX = '/api/v1';
export const USER_ROLE = { USER: 'user', ADMIN: 'admin' } as const;
export const VIDEO_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
export const USER_STATUS = { ACTIVE: 'active', DISABLED: 'disabled' } as const;
```

`packages/shared/src/schemas/auth.ts`:
```ts
import { z } from 'zod';

export const registerBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  displayName: z.string().min(1).max(64),
  phone: z.string().min(6).max(32).optional(),
});

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
```

`packages/shared/src/schemas/video.ts`:
```ts
import { z } from 'zod';

export const createVideoBodySchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).default(''),
  blobUrl: z.string().url(),
  coverUrl: z.string().url().optional(),
  durationMs: z.number().int().positive().max(600_000),
});

export type CreateVideoBody = z.infer<typeof createVideoBodySchema>;
```

`packages/shared/src/schemas/social.ts`:
```ts
import { z } from 'zod';

export const createCommentBodySchema = z.object({
  body: z.string().min(1).max(1000),
  parentId: z.string().uuid().optional(),
});

export type CreateCommentBody = z.infer<typeof createCommentBodySchema>;
```

`packages/shared/src/schemas/admin.ts`:
```ts
import { z } from 'zod';

export const moderationActionBodySchema = z.object({
  reason: z.string().max(500).optional(),
});

export const updateUserBodySchema = z.object({
  status: z.enum(['active', 'disabled']).optional(),
  role: z.enum(['user', 'admin']).optional(),
});
```

`packages/shared/src/index.ts`:
```ts
export * from './errors';
export * from './constants';
export * from './schemas/auth';
export * from './schemas/video';
export * from './schemas/social';
export * from './schemas/admin';
```

- [ ] **Step 4: Run tests — expect pass**

Run: `pnpm --filter @douyin/shared test`
Expected: PASS (2 files, all green).

- [ ] **Step 5: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): add error codes, zod DTOs, and vitest coverage"
```

---

### Task 3: `@douyin/db` — Drizzle schema + Neon client

**Files:**
- Create: `packages/db/package.json`, `packages/db/tsconfig.json`, `packages/db/drizzle.config.ts`, `packages/db/src/client.ts`, `packages/db/src/schema/index.ts`, `packages/db/src/schema/users.ts`, `packages/db/src/schema/videos.ts`, `packages/db/src/schema/social.ts`, `packages/db/src/schema/moderation.ts`, `packages/db/src/schema/config.ts`, `packages/db/src/index.ts`
- Test: `packages/db/src/schema/users.test.ts` (schema shape smoke test — no live DB required)

**Interfaces:**
- Consumes: `@douyin/shared` constants for enum string unions
- Produces: `createDb(connectionString: string)`, exported table objects, `typeof schema`

- [ ] **Step 1: Write failing schema smoke test**

```ts
// packages/db/src/schema/users.test.ts
import { describe, expect, it } from 'vitest';
import { users } from './users';

describe('users table', () => {
  it('exposes expected columns', () => {
    expect(users.id).toBeDefined();
    expect(users.email).toBeDefined();
    expect(users.passwordHash).toBeDefined();
    expect(users.role).toBeDefined();
  });
});
```

- [ ] **Step 2: Run — expect fail**

Add `packages/db/package.json`:
```json
{
  "name": "@douyin/db",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "generate": "drizzle-kit generate",
    "migrate": "drizzle-kit migrate",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@douyin/shared": "workspace:*",
    "@neondatabase/serverless": "^0.10.4",
    "drizzle-orm": "^0.38.3"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.1",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

Run: `pnpm install && pnpm --filter @douyin/db test`
Expected: FAIL.

- [ ] **Step 3: Implement schema + client**

`packages/db/src/schema/users.ts`:
```ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);
export const userStatusEnum = pgEnum('user_status', ['active', 'disabled']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique(),
  phone: text('phone').unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  role: userRoleEnum('role').notNull().default('user'),
  status: userStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

`packages/db/src/schema/videos.ts`:
```ts
import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const videoStatusEnum = pgEnum('video_status', ['pending', 'approved', 'rejected']);

export const videos = pgTable('videos', {
  id: uuid('id').defaultRandom().primaryKey(),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  blobUrl: text('blob_url').notNull(),
  coverUrl: text('cover_url'),
  durationMs: integer('duration_ms').notNull(),
  status: videoStatusEnum('status').notNull().default('pending'),
  viewCount: integer('view_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

`packages/db/src/schema/social.ts`:
```ts
import { pgEnum, pgTable, text, timestamp, uuid, unique } from 'drizzle-orm/pg-core';
import { users } from './users';
import { videos } from './videos';

export const commentStatusEnum = pgEnum('comment_status', ['visible', 'hidden']);

export const likes = pgTable(
  'likes',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    videoId: uuid('video_id')
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.userId, t.videoId)],
);

export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  videoId: uuid('video_id')
    .notNull()
    .references(() => videos.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  parentId: uuid('parent_id'),
  status: commentStatusEnum('status').notNull().default('visible'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

`packages/db/src/schema/moderation.ts`:
```ts
import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';
import { videos } from './videos';

export const moderationActionEnum = pgEnum('moderation_action', ['approve', 'reject']);

export const moderationLogs = pgTable('moderation_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  videoId: uuid('video_id')
    .notNull()
    .references(() => videos.id, { onDelete: 'cascade' }),
  adminId: uuid('admin_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  action: moderationActionEnum('action').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

`packages/db/src/schema/config.ts`:
```ts
import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const systemConfigs = pgTable('system_configs', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

`packages/db/src/schema/index.ts`:
```ts
export * from './users';
export * from './videos';
export * from './social';
export * from './moderation';
export * from './config';
```

`packages/db/src/client.ts`:
```ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export function createDb(connectionString: string) {
  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

export type Db = ReturnType<typeof createDb>;
```

`packages/db/src/index.ts`:
```ts
export * from './schema';
export * from './client';
```

`packages/db/drizzle.config.ts`:
```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- [ ] **Step 4: Run tests + generate migration**

Run: `pnpm --filter @douyin/db test`
Expected: PASS.

If `DATABASE_URL` is available locally:
Run: `pnpm db:generate`
Expected: SQL migration files under `packages/db/drizzle/`.

If no DB yet, still commit schema; CI/docs instruct migrate when URL is set. Generate migration SQL by running generate with a dummy postgres URL only if drizzle-kit requires it — prefer real Neon URL from `.env`.

- [ ] **Step 5: Commit**

```bash
git add packages/db
git commit -m "feat(db): add drizzle schema, neon client, and migrations"
```

---

### Task 4: Scaffold `apps/admin` (Nuxt) + wire DB + error helper

**Files:**
- Create: Nuxt app under `apps/admin`
- Create: `apps/admin/server/utils/db.ts`, `apps/admin/server/utils/errors.ts`, `apps/admin/server/utils/auth.ts` (stubs first), `apps/admin/nuxt.config.ts` updates, `apps/admin/package.json` workspace deps

**Interfaces:**
- Consumes: `createDb` from `@douyin/db`, `AppError` from `@douyin/shared`
- Produces: `useDb()`, `sendAppError(event, err)`, env-validated runtime config

- [ ] **Step 1: Scaffold Nuxt app**

Run from repo root:
```bash
pnpm dlx nuxi@latest init apps/admin --packageManager pnpm --force
```

Then set `apps/admin/package.json` name to `@douyin/admin` and add dependencies:
```json
{
  "dependencies": {
    "@douyin/db": "workspace:*",
    "@douyin/shared": "workspace:*",
    "@vercel/blob": "^0.27.0",
    "bcryptjs": "^2.4.3",
    "jose": "^5.9.6",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "vitest": "^2.1.8"
  }
}
```

Add scripts: `"test": "vitest run"`, `"typecheck": "nuxt typecheck"`.

- [ ] **Step 2: Configure Nuxt runtime**

`apps/admin/nuxt.config.ts` (ensure):
```ts
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET || '',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
    jwtAccessTtl: process.env.JWT_ACCESS_TTL || '15m',
    jwtRefreshTtl: process.env.JWT_REFRESH_TTL || '30d',
    blobToken: process.env.BLOB_READ_WRITE_TOKEN || '',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000',
    },
  },
});
```

`apps/admin/server/utils/db.ts`:
```ts
import { createDb, type Db } from '@douyin/db';

let _db: Db | null = null;

export function useDb() {
  if (_db) return _db;
  const { databaseUrl } = useRuntimeConfig();
  if (!databaseUrl) throw new Error('DATABASE_URL is not configured');
  _db = createDb(databaseUrl);
  return _db;
}
```

`apps/admin/server/utils/errors.ts`:
```ts
import { AppError, ErrorCode } from '@douyin/shared';
import type { H3Event } from 'h3';

export function sendAppError(event: H3Event, err: unknown) {
  if (err instanceof AppError) {
    setResponseStatus(event, err.status);
    return { error: { code: err.code, message: err.message } };
  }
  console.error(err);
  setResponseStatus(event, 500);
  return { error: { code: ErrorCode.INTERNAL, message: 'Internal server error' } };
}
```

- [ ] **Step 3: Health route smoke test**

Create `apps/admin/server/api/v1/health.get.ts`:
```ts
export default defineEventHandler(() => ({ ok: true, service: 'douyin-api' }));
```

Run: `pnpm --filter @douyin/admin exec nuxi prepare` then start briefly:
`pnpm --filter @douyin/admin dev` and `curl http://localhost:3000/api/v1/health`
Expected: `{"ok":true,"service":"douyin-api"}`

- [ ] **Step 4: Commit**

```bash
git add apps/admin
git commit -m "feat(admin): scaffold nuxt app with db and error helpers"
```

---

### Task 5: Auth API (register / login / refresh / logout)

**Files:**
- Create: `apps/admin/server/utils/password.ts`, `apps/admin/server/utils/tokens.ts`, `apps/admin/server/utils/auth.ts`
- Create: `apps/admin/server/api/v1/auth/register.post.ts`, `login.post.ts`, `refresh.post.ts`, `logout.post.ts`
- Test: `apps/admin/server/utils/tokens.test.ts`, `apps/admin/server/utils/password.test.ts`

**Interfaces:**
- Consumes: `registerBodySchema`, `loginBodySchema`, `users`, `refreshTokens`, `useDb`
- Produces:
  - `hashPassword(password: string): Promise<string>`
  - `verifyPassword(password: string, hash: string): Promise<boolean>`
  - `signAccessToken(payload: { sub: string; role: string }): Promise<string>`
  - `signRefreshToken(): { token: string; hash: string; expiresAt: Date }`
  - `requireUser(event): Promise<{ id: string; role: string }>`
  - `requireAdmin(event): Promise<{ id: string; role: 'admin' }>`

- [ ] **Step 1: Write failing unit tests for password + tokens**

```ts
// apps/admin/server/utils/password.test.ts
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password', () => {
  it('roundtrips', async () => {
    const hash = await hashPassword('Password1');
    expect(await verifyPassword('Password1', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });
});
```

```ts
// apps/admin/server/utils/tokens.test.ts
import { describe, expect, it } from 'vitest';
import { hashRefreshToken, createRefreshTokenValue } from './tokens';

describe('refresh token hashing', () => {
  it('hashes deterministically for same input', async () => {
    const { token } = createRefreshTokenValue();
    const a = await hashRefreshToken(token);
    const b = await hashRefreshToken(token);
    expect(a).toBe(b);
  });
});
```

- [ ] **Step 2: Run — expect fail**

Run: `pnpm --filter @douyin/admin test`
Expected: FAIL.

- [ ] **Step 3: Implement auth utils**

`password.ts` — use `bcryptjs` with cost 10.

`tokens.ts` — use `jose` `SignJWT` / `jwtVerify` with secrets from `useRuntimeConfig()`; refresh token = `crypto.randomUUID() + '.' + crypto.randomUUID()`; store `sha256` hex hash; parse TTL strings `15m`/`30d` into ms helper `parseTtl(ttl: string): number`.

`auth.ts`:
- Read `Authorization: Bearer` OR cookie `refresh_token` + optional `access_token`
- `requireUser` verifies access JWT; throws `AppError(AUTH_UNAUTHORIZED, ..., 401)`
- `requireAdmin` checks `role === 'admin'` else `AUTH_FORBIDDEN` 403
- On Admin login response: `setCookie(event, 'refresh_token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' })`

Auth handlers:
- `register.post.ts` — validate zod → insert user → return tokens
- `login.post.ts` — verify password + status active → tokens
- `refresh.post.ts` — rotate refresh (revoke old, insert new)
- `logout.post.ts` — revoke refresh hash

Response shape:
```ts
{
  user: { id, email, displayName, role },
  accessToken: string,
  refreshToken: string,
  expiresIn: number
}
```

- [ ] **Step 4: Run unit tests — expect pass**

Run: `pnpm --filter @douyin/admin test`
Expected: PASS.

Manual (with migrated DB):
```bash
curl -X POST http://localhost:3000/api/v1/auth/register -H "content-type: application/json" -d "{\"email\":\"u@example.com\",\"password\":\"Password1\",\"displayName\":\"U\"}"
```
Expected: 200 with `accessToken`.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/server
git commit -m "feat(api): implement JWT auth register/login/refresh/logout"
```

---

### Task 6: Upload credential + videos + feed + social APIs

**Files:**
- Create: `apps/admin/server/api/v1/uploads/blob.post.ts`
- Create: `apps/admin/server/api/v1/videos/index.post.ts`, `[id].get.ts`
- Create: `apps/admin/server/api/v1/feed.get.ts`
- Create: `apps/admin/server/api/v1/videos/[id]/like.post.ts`, `like.delete.ts`
- Create: `apps/admin/server/api/v1/videos/[id]/comments.get.ts`, `comments.post.ts`
- Test: `apps/admin/server/utils/feed-query.test.ts` (pure helper for cursor encode/decode)

**Interfaces:**
- Consumes: `requireUser`, `createVideoBodySchema`, `createCommentBodySchema`, `@vercel/blob` `handleUpload` or `put` token helpers
- Produces:
  - Feed item DTO: `{ id, title, description, blobUrl, coverUrl, durationMs, author: { id, displayName, avatarUrl }, likeCount, commentCount, likedByMe }`
  - `encodeCursor(createdAt: Date, id: string): string` / `decodeCursor(cursor: string)`

- [ ] **Step 1: Write cursor helper failing test**

```ts
import { describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor } from './feed-query';

describe('feed cursor', () => {
  it('roundtrips', () => {
    const d = new Date('2026-01-01T00:00:00.000Z');
    const id = '11111111-1111-1111-1111-111111111111';
    expect(decodeCursor(encodeCursor(d, id))).toEqual({ createdAt: d, id });
  });
});
```

- [ ] **Step 2: Implement APIs**

Upload (`blob.post.ts`):
- `requireUser`
- If `BLOB_READ_WRITE_TOKEN` missing in non-production, return mock `{ uploadUrl: null, mock: true, pathname: \`videos/${userId}/${Date.now()}.mp4\` }` and document that clients may send any https URL in create video for local demo
- If token present, use `@vercel/blob` client upload token pattern (`generateClientTokenFromReadWriteToken` if available in installed version, else server `put` proxy for MVP)

Videos create:
- Validate body → insert `status: 'pending'` → return video

Feed:
- Query `videos` where `status='approved'`, order by `created_at desc, id desc`, limit 10, optional cursor
- Left join author; aggregate like/comment counts; if Authorization present, set `likedByMe`

Like:
- Idempotent insert on conflict do nothing; delete removes row

Comments:
- List `status='visible'`; create requires auth

- [ ] **Step 3: Unit test cursor — pass**

Run: `pnpm --filter @douyin/admin test`
Expected: PASS including feed-query.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/server
git commit -m "feat(api): add blob upload, videos, feed, likes, and comments"
```

---

### Task 7: Admin moderation / users / analytics / config APIs + UI pages

**Files:**
- Create API: `apps/admin/server/api/v1/admin/moderation/videos.get.ts`, `videos/[id]/approve.post.ts`, `videos/[id]/reject.post.ts`, `users.get.ts`, `users/[id].patch.ts`, `analytics/summary.get.ts`, `config/[key].get.ts`, `config/[key].put.ts`
- Create pages: `apps/admin/pages/index.vue`, `login.vue`, `moderation/index.vue`, `users/index.vue`, `analytics/index.vue`, `config/index.vue`
- Create: `apps/admin/middleware/admin.global.ts` (client navigation guard for admin pages)

**Interfaces:**
- Consumes: `requireAdmin`, `moderationActionBodySchema`, `updateUserBodySchema`
- Produces: analytics DTO `{ users, videosPending, videosApproved, videosRejected, likes, comments }`

- [ ] **Step 1: Implement moderation handlers**

Approve/reject:
1. `requireAdmin`
2. Load video; if missing → `VIDEO_NOT_FOUND`
3. Update status; insert `moderation_logs`
4. Return `{ id, status }`

Users list: paginated; patch status/role.

Config get/put: upsert `system_configs` by key (default key `featureFlags` value `{ live:false, shop:false, notifications:false }`).

Analytics: `count()` queries.

- [ ] **Step 2: Build minimal Admin UI**

- Login form posts `/api/v1/auth/login`, stores access in `useState`, relies on refresh cookie
- Moderation table lists pending; buttons call approve/reject
- Users table + disable toggle
- Analytics shows summary numbers
- Config JSON editor for `featureFlags`

Keep styling simple Nuxt defaults — functional over polish.

- [ ] **Step 3: Manual verify**

With seed admin:
1. Login at `/login`
2. See pending video
3. Approve
4. `GET /api/v1/feed` returns that video

- [ ] **Step 4: Commit**

```bash
git add apps/admin
git commit -m "feat(admin): moderation, users, analytics, config APIs and pages"
```

---

### Task 8: `@douyin/api-client`

**Files:**
- Create: `packages/api-client/package.json`, `packages/api-client/src/index.ts`, `packages/api-client/src/client.ts`, `packages/api-client/src/types.ts`
- Test: `packages/api-client/src/client.test.ts` (mock fetch)

**Interfaces:**
- Consumes: DTO types from `@douyin/shared` where applicable
- Produces: `createApiClient(options: { baseUrl: string; getAccessToken?: () => string | null | Promise<string | null> })` with methods:
  - `register`, `login`, `refresh`, `logout`
  - `createVideo`, `getFeed`, `like`, `unlike`, `listComments`, `createComment`
  - `adminListModeration`, `adminApprove`, `adminReject`, `adminAnalytics`

- [ ] **Step 1: Failing test with mock fetch**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from './client';

describe('createApiClient', () => {
  it('sends bearer token on feed', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ items: [], nextCursor: null }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const api = createApiClient({
      baseUrl: 'http://localhost:3000',
      getAccessToken: () => 'tok',
    });
    await api.getFeed();
    expect(fetchMock).toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer tok' });
  });
});
```

- [ ] **Step 2: Implement client — tests pass**

All paths prefix `${baseUrl}/api/v1`. Throw on non-2xx with parsed `{ error: { code, message } }`.

- [ ] **Step 3: Commit**

```bash
git add packages/api-client
git commit -m "feat(api-client): typed HTTP client for mobile and admin"
```

---

### Task 9: Scaffold Expo mobile + vertical slice screens

**Files:**
- Create: `apps/mobile` via Expo
- Create: `apps/mobile/src/lib/api.ts`, `src/store/session.ts`, `src/app/_layout.tsx`, `src/app/(auth)/login.tsx`, `register.tsx`, `src/app/(tabs)/feed.tsx`, `upload.tsx`, `profile.tsx`
- Dependencies: `expo-router`, `expo-av` or `expo-video`, `expo-image`, `expo-secure-store`, `zustand`, `@tanstack/react-query`, `@douyin/api-client`

**Interfaces:**
- Consumes: `createApiClient`, SecureStore keys `accessToken`/`refreshToken`
- Produces: working screens for auth, feed playback, upload confirm, like/comment

- [ ] **Step 1: Scaffold**

```bash
pnpm dlx create-expo-app@latest apps/mobile -t tabs
```

Rename package to `@douyin/mobile`. Wire workspace deps. Set `EXPO_PUBLIC_API_BASE` in `.env`.

- [ ] **Step 2: Session store + API wiring**

Zustand store persists tokens via SecureStore; on 401 call refresh once then retry.

- [ ] **Step 3: Screens**

- Login/Register forms
- Feed: vertical `FlatList` pagingEnabled; `expo-image` for cover; play current + preload next `blobUrl`
- Upload: pick video (`expo-image-picker` / document picker); if blob mock mode, POST create video with placeholder `https://example.com/demo.mp4` OR real blob upload when token works
- Profile: show displayName + note of own uploads via feed filter later (MVP: show session user)

- [ ] **Step 4: Smoke**

Run: `pnpm --filter @douyin/mobile typecheck` (add script using `tsc --noEmit` if needed)
Run Expo; manually login → see approved feed item after admin approve.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): expo auth, feed, upload, and social slice"
```

---

### Task 10: Module stubs + `@douyin/ui` tokens + seed tooling

**Files:**
- Create: `packages/ui/src/tokens.ts`, `packages/ui/package.json`
- Create: `packages/modules/live/src/index.ts`, `shop/src/index.ts`, `notifications/src/index.ts` (+ package.json each)
- Create: `tooling/package.json`, `tooling/seed.ts`

**Interfaces:**
- Produces:
  - `ModuleDefinition { id: string; isEnabled(flags: Record<string, boolean>): boolean }`
  - `PushProvider { send(userId: string, title: string, body: string): Promise<void> }` with `NoopPushProvider`
  - `seed()` creates admin from `SEED_ADMIN_*` and default `featureFlags` config

- [ ] **Step 1: Implement stubs**

```ts
// packages/modules/notifications/src/index.ts
export interface PushProvider {
  send(userId: string, title: string, body: string): Promise<void>;
}

export class NoopPushProvider implements PushProvider {
  async send(): Promise<void> {
    /* intentionally empty */
  }
}

export const notificationsModule = {
  id: 'notifications',
  isEnabled(flags: Record<string, boolean>) {
    return flags.notifications === true;
  },
};
```

Mirror `live` / `shop` with `id` + `isEnabled` only.

`packages/ui/src/tokens.ts`:
```ts
export const colors = {
  brand: '#FE2C55',
  ink: '#161823',
  muted: '#8A8B91',
  surface: '#FFFFFF',
} as const;
```

- [ ] **Step 2: Seed script**

`tooling/seed.ts` uses `createDb(process.env.DATABASE_URL!)`, upserts admin user with bcrypt hash, upserts `system_configs` key `featureFlags`.

Script: `"seed": "tsx seed.ts"` with deps `tsx`, `@douyin/db`, `bcryptjs`.

Run: `pnpm db:migrate && pnpm db:seed` (requires DATABASE_URL)
Expected: admin can login.

- [ ] **Step 3: Commit**

```bash
git add packages/ui packages/modules tooling
git commit -m "feat: add module stubs, UI tokens, and DB seed tooling"
```

---

### Task 11: CI, docs, Cursor rules/skills, README

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `README.md`, `AGENTS.md`, `docs/architecture.md`, `docs/database.md`, `docs/api.md`, `docs/deployment.md`
- Create: `docs/prompts/add-live-module.md`, `docs/prompts/polish-feed.md`, `docs/prompts/add-shop-module.md`
- Create: `.cursor/rules/monorepo.mdc`, `.cursor/rules/api-boundaries.mdc`
- Create: `.cursor/skills/add-api-endpoint/SKILL.md`, `.cursor/skills/add-module/SKILL.md`

**Interfaces:**
- Consumes: completed apps/packages
- Produces: documented onboarding path matching success criteria in spec §13

- [ ] **Step 1: GitHub Actions**

```yaml
name: ci
on:
  push:
    branches: [master, main]
  pull_request:
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm --filter @douyin/shared build || true
      - run: pnpm --filter @douyin/admin build
```

Note: if packages use TS source exports without build, remove unused build line; Admin `nuxt build` is required.

- [ ] **Step 2: Write docs**

Each doc must cover:
- architecture: diagram of apps/packages + boundary rules
- database: tables + video status machine
- api: endpoint list from spec §7 with auth notes
- deployment: Neon, Blob, Vercel env vars from `.env.example`
- prompts: copy-paste agent prompts referencing packages/modules patterns

- [ ] **Step 3: Cursor assets**

`monorepo.mdc`: always use pnpm; never put DB access in mobile.
`api-boundaries.mdc`: new endpoints under `server/api/v1`; validate with zod from `@douyin/shared`.
Skills: checklist steps for adding endpoint / module matching Task 6/10 patterns.

- [ ] **Step 4: README**

Include: prerequisites, `pnpm install`, env setup, migrate/seed, `pnpm dev`, vertical-slice demo script (register → upload → admin approve → feed), CI badge placeholder.

- [ ] **Step 5: Final verification checklist**

- [ ] `pnpm install`
- [ ] `pnpm test` green
- [ ] `pnpm --filter @douyin/admin build` succeeds
- [ ] Health + auth + feed curl path documented
- [ ] Spec success criteria §13 all addressed

- [ ] **Step 6: Commit**

```bash
git add .github README.md AGENTS.md docs .cursor
git commit -m "docs: add CI, architecture docs, and Cursor developer experience assets"
```

---

## Spec coverage self-review

| Spec area | Task(s) |
| --- | --- |
| Monorepo workspaces | 1 |
| shared / config | 1–2 |
| Neon + Drizzle model | 3 |
| Nuxt admin + Nitro API | 4–7 |
| JWT auth | 5 |
| Blob upload | 6 |
| Feed + like/comment | 6, 9 |
| Moderation / users / analytics / config | 7 |
| Expo mobile slice | 9 |
| api-client | 8 |
| Module stubs + extensibility | 10 |
| CI/CD + eslint/prettier + tests | 1, 2, 11 |
| Docs + Cursor/skills + prompts | 11 |
| Seed admin | 10 |
| Non-goals respected | throughout (stubs only for live/shop) |

## Placeholder / consistency notes

- Auth cookie + Bearer dual middleware defined in Task 5; mobile SecureStore in Task 9.
- Feed DTO field names fixed in Task 6 and reused by api-client Task 8.
- Package scope consistently `@douyin/*`.
