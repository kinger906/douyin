import { users } from '@douyin/db';
import { AppError, ErrorCode } from '@douyin/shared';
import { desc, sql } from 'drizzle-orm';
import { defineEventHandler, getQuery } from 'h3';
import { requireAdmin } from '~/server/utils/auth';
import { useDb } from '~/server/utils/db';
import { sendAppError } from '~/server/utils/errors';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function readPositiveInteger(rawValue: unknown, fallback: number, label: string) {
  if (rawValue === undefined) {
    return fallback;
  }

  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < 1) {
    throw new AppError(ErrorCode.VALIDATION_FAILED, `Invalid ${label}`, 400);
  }

  return value;
}

export default defineEventHandler(async (event) => {
  try {
    await requireAdmin(event);

    const query = getQuery(event);
    const page = readPositiveInteger(Array.isArray(query.page) ? query.page[0] : query.page, DEFAULT_PAGE, 'page');
    const requestedLimit = readPositiveInteger(
      Array.isArray(query.limit) ? query.limit[0] : query.limit,
      DEFAULT_LIMIT,
      'limit',
    );
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const offset = (page - 1) * limit;

    const [items, totals] = await Promise.all([
      useDb()
        .select({
          id: users.id,
          email: users.email,
          phone: users.phone,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          role: users.role,
          status: users.status,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt), desc(users.id))
        .limit(limit)
        .offset(offset),
      useDb()
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(users),
    ]);

    return {
      items: items.map((user) => ({
        id: user.id,
        email: user.email,
        phone: user.phone,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      })),
      page,
      pageSize: limit,
      total: Number(totals[0]?.count ?? 0),
    };
  } catch (err) {
    return sendAppError(event, err);
  }
});
