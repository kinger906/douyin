import { z } from 'zod';

const runtimeEnvSchema = z.object({
  DATABASE_URL: z.string().default(''),
  JWT_ACCESS_SECRET: z.string().default(''),
  JWT_REFRESH_SECRET: z.string().default(''),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  BLOB_READ_WRITE_TOKEN: z.string().default(''),
  NUXT_PUBLIC_API_BASE: z.string().url().default('http://localhost:3000'),
});

const runtimeEnv = runtimeEnvSchema.parse(process.env);

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  runtimeConfig: {
    databaseUrl: runtimeEnv.DATABASE_URL,
    jwtAccessSecret: runtimeEnv.JWT_ACCESS_SECRET,
    jwtRefreshSecret: runtimeEnv.JWT_REFRESH_SECRET,
    jwtAccessTtl: runtimeEnv.JWT_ACCESS_TTL,
    jwtRefreshTtl: runtimeEnv.JWT_REFRESH_TTL,
    blobToken: runtimeEnv.BLOB_READ_WRITE_TOKEN,
    public: {
      apiBase: runtimeEnv.NUXT_PUBLIC_API_BASE,
    },
  },
});
