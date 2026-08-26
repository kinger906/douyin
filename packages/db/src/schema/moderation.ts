import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';
import { videos } from './videos';

export const moderationActionEnum = pgEnum('moderation_action', ['approve', 'reject']);

export const moderationLogs = pgTable('moderation_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  videoId: uuid('video_id')
    .notNull()
    .references(() => videos.id, { onDelete: 'cascade' }),
  adminId: uuid('admin_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  action: moderationActionEnum('action').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
