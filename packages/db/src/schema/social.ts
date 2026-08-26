import { pgEnum, pgTable, text, timestamp, uuid, unique } from 'drizzle-orm/pg-core';
import { users } from './users';
import { videos } from './videos';

export const commentStatusEnum = pgEnum('comment_status', ['visible', 'hidden']);

export const likes = pgTable(
  'likes',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    videoId: uuid('video_id')
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.userId, t.videoId)],
);

export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  videoId: uuid('video_id')
    .notNull()
    .references(() => videos.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  parentId: uuid('parent_id'),
  status: commentStatusEnum('status').notNull().default('visible'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
