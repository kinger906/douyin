# Deployment

## Target Shape

The MVP is designed around one deployed web service:

- `apps/admin` on Vercel for the Nuxt 3 admin UI
- Nitro server routes under `/api/v1` deployed together with the admin app
- Neon Postgres for persistent data
- Vercel Blob for uploaded media

## Required Environment Variables

Set these in Vercel for the admin project and in local `.env` for development:

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
- `EXPO_PUBLIC_API_BASE`: the same base URL used by the mobile client
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`: long random strings

## Vercel Notes

- The Nuxt build used in CI is `pnpm --filter @douyin/admin build`.
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

The GitHub Actions workflow verifies lint, tests, typecheck, and the Nuxt production build. It does not:

- run live Neon migrations in CI by default
- require Blob credentials
- produce a mobile store artifact

If you later add repository secrets for database-backed smoke tests, keep those jobs separate from the fast default quality gate.
