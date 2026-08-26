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

function readRuntimeConfig() {
  const runtimeConfigGetter = Reflect.get(globalThis, 'useRuntimeConfig');
  if (typeof runtimeConfigGetter === 'function') {
    return runtimeConfigGetter();
  }

  return {
    databaseUrl: process.env.DATABASE_URL || '',
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET || '',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
    jwtAccessTtl: process.env.JWT_ACCESS_TTL || '15m',
    jwtRefreshTtl: process.env.JWT_REFRESH_TTL || '30d',
    blobToken: process.env.BLOB_READ_WRITE_TOKEN || '',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000',
    },
  };
}

export function useAppRuntimeConfig() {
  const runtimeConfig = runtimeConfigSchema.parse(readRuntimeConfig());

  if (process.env.NODE_ENV === 'production') {
    return productionRuntimeConfigSchema.parse(runtimeConfig);
  }

  return runtimeConfig;
}
