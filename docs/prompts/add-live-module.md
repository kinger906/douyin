# Prompt: Add Live Module

Use this prompt when you want an agent to extend the repo with a live-streaming module without breaking the current MVP boundaries.

```text
You are adding a live module to C:\my-git\douyin.

Constraints:
- Keep package management on pnpm.
- Preserve the existing monorepo layout.
- Do not add direct database access to apps/mobile.
- Put new shared contracts in packages/shared.
- Put live module code behind feature flags in system_configs.value.featureFlags.
- Keep public HTTP routes under apps/admin/server/api/v1.
- Reuse @douyin/db for persistence and @douyin/api-client for client calls.
- Document all new commands and env vars.

Deliver:
- updates to packages/modules/live
- any required shared DTOs and DB schema additions
- Nitro endpoints under /api/v1/live/*
- minimal admin/mobile integration only if needed for the first vertical slice
- README/docs updates

Verification:
- run targeted tests for changed packages
- run pnpm typecheck
- run pnpm --filter @douyin/admin build
```
