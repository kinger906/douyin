import { users } from '@douyin/db';
import { AppError, ErrorCode, updateMeBodySchema } from '@douyin/shared';
import { eq } from 'drizzle-orm';
import { defineEventHandler, readBody } from 'h3';
import { requireUser } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { sendAppError } from '~/server/utils/errors';

export default defineEventHandler(async (event) => {
  try {
    const user = await requireUser(event);
    const parsed = updateMeBodySchema.safeParse(await readBody(event));
    if (!parsed.success) {
      throw new AppError(
        ErrorCode.VALIDATION_FAILED,
        parsed.error.issues[0]?.message ?? 'Invalid request body',
        400,
      );
    }

    const patch: { displayName?: string; avatarUrl?: string | null } = {};
    if (parsed.data.displayName !== undefined) {
      patch.displayName = parsed.data.displayName;
    }
    if (parsed.data.avatarUrl !== undefined) {
      patch.avatarUrl = parsed.data.avatarUrl;
    }

    const [updated] = await useDb()
      .update(users)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        role: users.role,
      });

    if (!updated) {
      throw new AppError(ErrorCode.USER_NOT_FOUND, 'User not found', 404);
    }

    return {
      id: updated.id,
      email: updated.email,
      displayName: updated.displayName,
      avatarUrl: updated.avatarUrl,
      role: updated.role,
      douyinId: updated.id.replace(/-/g, '').slice(0, 9),
    };
  } catch (err) {
    return sendAppError(event, err);
  }
});
