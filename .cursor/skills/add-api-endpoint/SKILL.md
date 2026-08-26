---
name: add-api-endpoint
description: Add or update a Nitro API endpoint for this monorepo. Use when the user asks for a new route, request validation, admin endpoint, feed change, auth handler, or other work under apps/admin/server/api/v1.
---

# Add API Endpoint

## Goal

Extend the API without breaking the monorepo boundaries:

- endpoints live in `apps/admin/server/api/v1`
- validation lives in `@douyin/shared` when the contract is reusable
- persistence flows through `@douyin/db`
- clients consume changes through `@douyin/api-client`

## Workflow

Copy this checklist and work through it:

```text
API Endpoint Progress
- [ ] Confirm route path and auth requirement
- [ ] Check for an existing shared schema or constant to reuse
- [ ] Add or update Zod schemas in packages/shared if the contract changed
- [ ] Implement the Nitro handler under apps/admin/server/api/v1
- [ ] Reuse server utilities such as useDb(), sendAppError(), auth helpers, and video helpers
- [ ] Update packages/api-client if the endpoint is client-facing
- [ ] Document README/docs changes if setup or usage changed
- [ ] Run targeted tests, pnpm typecheck, and pnpm --filter @douyin/admin build
```

## Conventions

- Keep routes versioned under `/api/v1`.
- Prefer shared error codes from `@douyin/shared`.
- Do not add DB access to mobile code.
- Keep handler files small and move reusable logic to `apps/admin/server/utils`.
- If a route is admin-only, enforce `requireAdmin()`.

## Common Commands

```bash
pnpm --filter @douyin/shared test
pnpm --filter @douyin/admin test
pnpm typecheck
pnpm --filter @douyin/admin build
```
