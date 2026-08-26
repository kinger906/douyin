import { systemConfigs } from '@douyin/db';
import { AppError, ErrorCode } from '@douyin/shared';
import { eq } from 'drizzle-orm';
import { defineEventHandler, getRouterParam, readBody } from 'h3';
import { requireAdmin } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { sendAppError } from '~/server/utils/errors';

function readConfigValue(body: unknown) {
  if (!body || typeof body !== 'object' || !Reflect.has(body, 'value')) {
    throw new AppError(ErrorCode.VALIDATION_FAILED, 'Request body must include value', 400);
  }

  return Reflect.get(body, 'value');
}

export default defineEventHandler(async (event) => {
  try {
    await requireAdmin(event);

    const key = getRouterParam(event, 'key');
    if (!key) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, 'Config key is required', 400);
    }

    const value = readConfigValue(await readBody(event));
    const now = new Date();

    await useDb()
      .insert(systemConfigs)
      .values({
        key,
        value,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: systemConfigs.key,
        set: {
          value,
          updatedAt: now,
        },
      });

    const [config] = await useDb()
      .select({
        key: systemConfigs.key,
        value: systemConfigs.value,
        updatedAt: systemConfigs.updatedAt,
      })
      .from(systemConfigs)
      .where(eq(systemConfigs.key, key))
      .limit(1);

    return {
      key: config?.key ?? key,
      value: config?.value ?? value,
      updatedAt: config?.updatedAt.toISOString() ?? now.toISOString(),
    };
  } catch (err) {
    return sendAppError(event, err);
  }
});
