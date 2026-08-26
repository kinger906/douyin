import { createDb, type Db } from '@douyin/db';
import { useAppRuntimeConfig } from './runtime-config';

let db: Db | null = null;

export function useDb(): Db {
  if (db) {
    return db;
  }

  const { databaseUrl } = useAppRuntimeConfig();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured');
  }

  db = createDb(databaseUrl);
  return db;
}
