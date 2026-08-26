# Prompt: Polish Feed

Use this prompt when you want an agent to improve the mobile feed UX while staying within the current API and monorepo boundaries.

```text
You are polishing the feed experience in C:\my-git\douyin.

Goals:
- Improve playback, loading, and interaction quality for apps/mobile.
- Preserve the existing /api/v1/feed contract unless a clearly justified shared-contract change is required.

Constraints:
- Keep server changes in apps/admin/server/api/v1.
- Reuse @douyin/api-client and @douyin/shared.
- Do not add database access or secrets to the mobile app.
- Keep approved-only feed semantics intact.
- Favor targeted changes over wide refactors.

Deliver:
- feed UX improvements in apps/mobile
- any required small API or shared-contract updates
- tests or type-level verification where it meaningfully reduces regression risk
- docs updates if commands or behaviors change

Verification:
- run relevant package tests
- run pnpm --filter @douyin/mobile typecheck
- run pnpm --filter @douyin/admin build if server or shared code changed
```
