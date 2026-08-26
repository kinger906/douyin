import { createDb, systemConfigs, users } from '@douyin/db';
import bcrypt from 'bcryptjs';

const PASSWORD_SALT_ROUNDS = 10;

const DEFAULT_FEATURE_FLAGS = {
  live: false,
  shop: false,
  notifications: false,
} as const;

export async function seed(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run seed');
  }

  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';
  const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  const db = createDb(databaseUrl);

  await db
    .insert(users)
    .values({
      email,
      passwordHash,
      displayName: 'Admin',
      role: 'admin',
      status: 'active',
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        passwordHash,
        displayName: 'Admin',
        role: 'admin',
        status: 'active',
        updatedAt: new Date(),
      },
    });

  await db
    .insert(systemConfigs)
    .values({
      key: 'featureFlags',
      value: DEFAULT_FEATURE_FLAGS,
    })
    .onConflictDoUpdate({
      target: systemConfigs.key,
      set: {
        value: DEFAULT_FEATURE_FLAGS,
        updatedAt: new Date(),
      },
    });
}

seed()
  .then(() => {
    console.log('Seed completed');
  })
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
