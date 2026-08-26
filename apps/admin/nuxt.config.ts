export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  colorMode: {
    preference: 'light',
    fallback: 'light',
  },
  // Avoid Google Fonts timeouts in mainland China
  fonts: {
    defaults: {
      weights: [400, 500, 600, 700],
    },
    providers: {
      google: false,
      googleicons: false,
    },
  },
  icon: {
    serverBundle: 'local',
    clientBundle: {
      scan: true,
    },
  },
  app: {
    head: {
      title: '抖音管理后台',
      htmlAttrs: { lang: 'zh-CN' },
    },
  },
  // Vercel CLI / platform sets VERCEL=1; force Nitro Build Output API instead of .output
  nitro: {
    preset: process.env.VERCEL || process.env.NITRO_PRESET === 'vercel' ? 'vercel' : undefined,
  },
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
