import { systemConfigs } from '@douyin/db';
import { AppError, ErrorCode } from '@douyin/shared';
import { eq } from 'drizzle-orm';
import { defineEventHandler, getRouterParam } from 'h3';
import { requireAdmin } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { sendAppError } from '~/server/utils/errors';

const DEFAULT_CONFIGS: Record<string, unknown> = {
  featureFlags: {
    live: false,
    shop: false,
    notifications: false,
  },
};

export default defineEventHandler(async (event) => {
  try {
    await requireAdmin(event);

    const key = getRouterParam(event, 'key');
    if (!key) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, 'Config key is required', 400);
    }

    const [config] = await useDb()
      .select({
        key: systemConfigs.key,
        value: systemConfigs.value,
        updatedAt: systemConfigs.updatedAt,
      })
      .from(systemConfigs)
      .where(eq(systemConfigs.key, key))
      .limit(1);

    if (!config) {
      return {
        key,
        value: DEFAULT_CONFIGS[key] ?? null,
        updatedAt: null,
      };
    }

    return {
      key: config.key,
      value: config.value,
      updatedAt: config.updatedAt.toISOString(),
    };
  } catch (err) {
    return sendAppError(event, err);
  }
});
