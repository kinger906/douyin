# Prompt: Add Shop Module

Use this prompt when you want an agent to grow the repository from the existing shop stub toward a first usable commerce slice.

```text
You are adding a shop module to C:\my-git\douyin.

Constraints:
- Keep the current pnpm workspace structure.
- Start from packages/modules/shop and expand outward only as needed.
- Keep API routes in apps/admin/server/api/v1/shop/*.
- Put validation and shared DTOs in @douyin/shared.
- Use @douyin/db for persistence from Nitro only.
- Do not put checkout, payment secrets, or direct DB access in apps/mobile.
- Document deferred payment or fulfillment gaps honestly if they remain out of scope.

Deliver:
- shop module package updates
- shared DTOs and any new DB schema
- Nitro endpoints for the first shop slice
- minimal admin/mobile integration for the chosen flow
- README/docs updates for setup and verification

Verification:
- run targeted tests
- run pnpm typecheck
- run pnpm --filter @douyin/admin build
```
