# Task 5 Report: Auth API (`register` / `login` / `refresh` / `logout`)

**Status:** DONE  
**Date:** 2026-08-26  
**Branch:** `feat/douyin-monorepo-mvp`

## Summary

Implemented real auth for `apps/admin` with bcrypt password hashing, JOSE-signed access JWTs, deterministic SHA-256 refresh token hashing, DB-backed refresh token rotation/revocation, and `/api/v1/auth/*` handlers for register/login/refresh/logout.

`requireUser()` now accepts `Authorization: Bearer <token>`, `access_token` cookie, or a valid `refresh_token` cookie-backed admin session; `requireAdmin()` enforces `role === 'admin'`.

## Files Changed

- `apps/admin/server/utils/password.ts`
- `apps/admin/server/utils/tokens.ts`
- `apps/admin/server/utils/auth.ts`
- `apps/admin/server/utils/runtime-config.ts`
- `apps/admin/server/utils/password.test.ts`
- `apps/admin/server/utils/tokens.test.ts`
- `apps/admin/server/api/v1/auth/register.post.ts`
- `apps/admin/server/api/v1/auth/login.post.ts`
- `apps/admin/server/api/v1/auth/refresh.post.ts`
- `apps/admin/server/api/v1/auth/logout.post.ts`

## TDD Evidence

### RED

```text
pnpm --filter @douyin/admin test

FAIL  server/utils/password.test.ts
Error: Failed to load url ./password ... Does the file exist?

FAIL  server/utils/tokens.test.ts
Error: Failed to load url ./tokens ... Does the file exist?
```

### GREEN

```text
pnpm --filter @douyin/admin test

✓ server/utils/tokens.test.ts (1 test)
✓ server/utils/password.test.ts (1 test)

Test Files  2 passed (2)
Tests       2 passed (2)
```

### Typecheck

```text
pnpm --filter @douyin/admin typecheck
(exit 0)
```

## Notes

- `useAppRuntimeConfig()` now falls back to environment variables when Nuxt runtime globals are unavailable, so plain Vitest runs can exercise token helpers.
- Admin sessions set `refresh_token` and `access_token` cookies; refresh token hashes are stored in `refresh_tokens`, never the raw token value.
- Manual curl/live DB verification was not required for completion and was not run here.

## Concerns

1. Admin responses still include `refreshToken` in the JSON body because the brief requires that response shape, even though the admin flow also sets the httpOnly cookie.
2. No integration test currently exercises DB persistence, cookie rotation, or handler-level error mapping against a live database.
