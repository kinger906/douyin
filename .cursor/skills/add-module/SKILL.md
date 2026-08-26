---
name: add-module
description: Add a new feature module or extend the live, shop, or notifications stubs in this monorepo. Use when the user asks for a pluggable module, feature-flagged capability, or a new product area that should start in packages/modules.
---

# Add Module

## Goal

Grow a new product area from the existing module pattern instead of scattering logic across the apps first.

## Workflow

```text
Module Progress
- [ ] Confirm the module goal and the first vertical slice
- [ ] Start in packages/modules/<name> and define the module surface
- [ ] Add shared DTOs/constants to packages/shared if the module crosses app boundaries
- [ ] Add DB schema only if Nitro needs persistent data now
- [ ] Keep new API routes under apps/admin/server/api/v1
- [ ] Gate app behavior through featureFlags in system_configs
- [ ] Add minimal admin/mobile integration only for the chosen slice
- [ ] Update docs, prompts, and README when workflows or env vars change
- [ ] Run targeted tests, pnpm typecheck, and pnpm --filter @douyin/admin build
```

## Boundaries

- `apps/admin` may use `@douyin/db`; `apps/mobile` may not.
- Favor thin adapters in app code and keep module-specific concepts grouped together.
- Do not promise full live streaming, commerce, or notifications delivery if the work is still a stub or partial slice. Document deferred pieces clearly.

## Common Commands

```bash
pnpm test
pnpm typecheck
pnpm --filter @douyin/admin build
pnpm --filter @douyin/mobile typecheck
```
