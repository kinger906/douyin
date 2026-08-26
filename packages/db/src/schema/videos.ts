import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const videoStatusEnum = pgEnum('video_status', ['pending', 'approved', 'rejected']);

export const videos = pgTable('videos', {
  id: uuid('id').defaultRandom().primaryKey(),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  blobUrl: text('blob_url').notNull(),
  coverUrl: text('cover_url'),
  durationMs: integer('duration_ms').notNull(),
  status: videoStatusEnum('status').notNull().default('pending'),
  viewCount: integer('view_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
