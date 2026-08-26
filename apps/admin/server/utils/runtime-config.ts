import { z } from 'zod';

const runtimeConfigSchema = z.object({
  databaseUrl: z.string().default(''),
  jwtAccessSecret: z.string().default(''),
  jwtRefreshSecret: z.string().default(''),
  jwtAccessTtl: z.string().default('15m'),
  jwtRefreshTtl: z.string().default('30d'),
  blobToken: z.string().default(''),
  public: z.object({
    apiBase: z.string().url().default('http://localhost:3000'),
  }),
});

const productionRuntimeConfigSchema = runtimeConfigSchema.extend({
  databaseUrl: z.string().min(1, 'DATABASE_URL is required in production'),
  jwtAccessSecret: z.string().min(1, 'JWT_ACCESS_SECRET is required in production'),
  jwtRefreshSecret: z.string().min(1, 'JWT_REFRESH_SECRET is required in production'),
  blobToken: z.string().min(1, 'BLOB_READ_WRITE_TOKEN is required in production'),
});

export function useAppRuntimeConfig() {
  const runtimeConfig = runtimeConfigSchema.parse(useRuntimeConfig());

  if (process.env.NODE_ENV === 'production') {
    return productionRuntimeConfigSchema.parse(runtimeConfig);
  }

  return runtimeConfig;
}
