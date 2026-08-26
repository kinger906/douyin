export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET || '',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
    jwtAccessTtl: process.env.JWT_ACCESS_TTL || '15m',
    jwtRefreshTtl: process.env.JWT_REFRESH_TTL || '30d',
    blobToken: process.env.BLOB_READ_WRITE_TOKEN || '',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000',
    },
  },
});
