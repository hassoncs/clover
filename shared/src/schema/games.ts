import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const games = sqliteTable('games', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  installId: text('install_id'),
  title: text('title').notNull(),
  description: text('description'),
  // JSON blob containing the full GameDefinition
  definition: text('definition').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  isPublic: integer('is_public', { mode: 'boolean' }).default(false),
  playCount: integer('play_count').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

// Import users for the reference
import { users } from './users';

export const insertGameSchema = createInsertSchema(games);
export const selectGameSchema = createSelectSchema(games);

export type Game = z.infer<typeof selectGameSchema>;
export type NewGame = z.infer<typeof insertGameSchema>;

// Client type (omits sync/internal fields)
export type ClientGame = Omit<Game, 'installId' | 'deletedAt'>;
