# Douyin Repo Agent Guide

## Purpose

This repository ships a Douyin-like vertical-slice MVP with:

- Nuxt 3 admin UI in `apps/admin`
- Nitro API endpoints under `apps/admin/server/api/v1`
- Expo mobile app in `apps/mobile`
- Shared workspace packages under `packages/*`

## Required Working Conventions

- Use `pnpm`, not `npm` or `yarn`.
- Treat `apps/admin` as the only runtime that may talk to Postgres through `@douyin/db`.
- Do not add database access, secrets, or direct SQL to `apps/mobile`.
- Keep public HTTP endpoints versioned under `/api/v1`.
- Reuse Zod schemas, constants, and error codes from `@douyin/shared` before inventing new request or response shapes.
- Keep live, shop, and notifications work behind feature flags and module boundaries in `packages/modules/*`.
- Do not commit anything under `.superpowers/`.

## Common Commands

```bash
pnpm install
pnpm dev
pnpm lint
pnpm test
pnpm typecheck
pnpm --filter @douyin/admin build
pnpm db:migrate
pnpm db:seed
```

## Implementation Checklist

When changing API or app behavior:

1. Update shared schemas or constants first when the contract changes.
2. Keep server handlers in `apps/admin/server/api/v1`.
3. Use `sendAppError()` for handler failures.
4. Use `useDb()` from `apps/admin/server/utils/db` instead of creating ad hoc database clients.
5. Document any new endpoint, env var, or workflow in `README.md` or `docs/`.

## Verification

- Prefer targeted package checks while iterating.
- Before finishing repo-level work, run `pnpm test`.
- Run `pnpm typecheck` for workspace-wide contract safety.
- Run `pnpm --filter @douyin/admin build` before merging server or admin changes.

## Current MVP Caveats

- CI does not use a live database unless secrets are added later.
- Local development can use Blob mock mode when `BLOB_READ_WRITE_TOKEN` is unset.
- Mobile verification is typecheck-level only; store builds are deferred.
