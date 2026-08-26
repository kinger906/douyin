import { createDb, type Db } from '@douyin/db';

let db: Db | null = null;

export function useDb(): Db {
  if (db) {
    return db;
  }

  const { databaseUrl } = useRuntimeConfig();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured');
  }

  db = createDb(databaseUrl);
  return db;
}
