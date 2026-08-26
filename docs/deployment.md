# Deployment

## Target Shape

The MVP is designed around one deployed web service:

- `apps/admin` on Vercel for the Nuxt 3 admin UI
- Nitro server routes under `/api/v1` deployed together with the admin app
- Neon Postgres for persistent data
- Vercel Blob for uploaded media

## Required Environment Variables

**Production (source of truth = GitHub Secrets):** configure once in the repository (or the `production` Environment). Deploy CI syncs them to Vercel Production before each release.

**Local development:** keep using root / `apps/admin` `.env` (see `.env.example`).

```dotenv
DATABASE_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
BLOB_READ_WRITE_TOKEN=
NUXT_PUBLIC_API_BASE=
EXPO_PUBLIC_API_BASE=
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
```

Recommended production values:

- `NUXT_PUBLIC_API_BASE`: the public HTTPS URL for the deployed admin/API app
- `EXPO_PUBLIC_API_BASE`: the same base URL used by the mobile client (mobile app env, not Vercel)
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`: long random strings
- `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL`: optional; CI defaults to `15m` / `30d` if unset
- `BLOB_READ_WRITE_TOKEN`: optional; empty enables mock upload tickets

## Vercel Notes

- The Nuxt build used in CI is `pnpm --filter @douyin/admin build`.
- Production deploys run from GitHub Actions on `main` / `master` after the quality job passes. App env vars live in **GitHub Secrets** and are synced to Vercel on each deploy. See [GitHub Actions → Vercel](#github-actions--vercel-admin).
- `DATABASE_URL`, JWT secrets, and Blob token are required in production because the runtime config validator enforces them.
- The API and admin UI share a deployment, so database and auth changes affect both surfaces at once.

## Neon Notes

- Create a Postgres database and copy the connection string into `DATABASE_URL`.
- Run `pnpm db:migrate` before first use.
- Run `pnpm db:seed` to create the admin account and default feature flags.

## Blob Notes

- Real upload token generation requires `BLOB_READ_WRITE_TOKEN`.
- Local development can still exercise the upload flow without Blob by using the mock upload ticket path and a placeholder HTTPS media URL.

## CI Scope

The GitHub Actions workflow (`.github/workflows/ci.yml`) has two jobs:

1. **quality** (every push/PR): lint, test, typecheck, and `pnpm --filter @douyin/admin build`
2. **deploy-admin** (push to `main` / `master` only, after quality passes): read app config from GitHub Secrets, sync them to Vercel Production, then `vercel build` + `deploy --prebuilt --prod`

It does not:

- run live Neon migrations in CI by default
- require Blob credentials for the quality job
- produce a mobile store artifact

If you later add repository secrets for database-backed smoke tests, keep those jobs separate from the fast default quality gate.

## GitHub Actions → Vercel (admin)

### One-time Vercel project setup

1. Install the CLI locally: `npm i -g vercel`
2. From the repo root (or `apps/admin`), link a project:

```bash
cd apps/admin
vercel link
```

When prompted, set **Root Directory** to `apps/admin` (or create the project in the Vercel dashboard with Root Directory `apps/admin`).

3. Copy IDs from `apps/admin/.vercel/project.json`:

- `orgId` → GitHub secret `VERCEL_ORG_ID`
- `projectId` → GitHub secret `VERCEL_PROJECT_ID`

4. Create a Vercel token at [Account Tokens](https://vercel.com/account/tokens) → GitHub secret `VERCEL_TOKEN`.

### Required GitHub repository secrets

Put these on the repo **or** on the GitHub Environment named `production` (the deploy job uses that environment).

| Secret | Required | Purpose |
|--------|----------|---------|
| `VERCEL_TOKEN` | yes | Deploy auth |
| `VERCEL_ORG_ID` | yes | From `apps/admin/.vercel/project.json` → `orgId` |
| `VERCEL_PROJECT_ID` | yes | From `apps/admin/.vercel/project.json` → `projectId` |
| `DATABASE_URL` | yes | Neon Postgres |
| `JWT_ACCESS_SECRET` | yes | Access token signing |
| `JWT_REFRESH_SECRET` | yes | Refresh token signing |
| `NUXT_PUBLIC_API_BASE` | yes | Public API/admin HTTPS origin (e.g. `https://your-app.vercel.app`) |
| `JWT_ACCESS_TTL` | no | Defaults to `15m` |
| `JWT_REFRESH_TTL` | no | Defaults to `30d` |
| `BLOB_READ_WRITE_TOKEN` | no | Real Blob uploads; empty = mock mode |

Deploy flow treats **GitHub Secrets as the source of truth**: before each production deploy, CI upserts the app variables into Vercel Production, writes them into the local Vercel build env file, then builds and deploys. You do **not** need to maintain the same keys separately in the Vercel dashboard (CI will overwrite Production values on each deploy).

`SEED_*` and `EXPO_PUBLIC_API_BASE` stay local / mobile-only and are not synced to Vercel.

### Monorepo build on Vercel

`apps/admin/vercel.json` installs from the workspace root and builds with:

```bash
pnpm --filter @douyin/admin build
```

Do not commit `.vercel/` (local link metadata). Keep all production secrets in GitHub Secrets only.
