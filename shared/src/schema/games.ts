import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const games = sqliteTable('games', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  installId: text('install_id'),
  title: text('title').notNull(),
  description: text('description'),
  definition: text('definition').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  isPublic: integer('is_public', { mode: 'boolean' }).default(false),
  playCount: integer('play_count').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  validationReport: text('validation_report'),
  validationScore: integer('validation_score'),
  validationCriticalCount: integer('validation_critical_count').default(0),
  validationWarningCount: integer('validation_warning_count').default(0),
  validationValid: integer('validation_valid', { mode: 'boolean' }).default(false),
  validationUpdatedAt: integer('validation_updated_at', { mode: 'timestamp' }),
  validatorVersion: text('validator_version'),
});

// Import users for the reference
import { users } from './users';

export const insertGameSchema = createInsertSchema(games);
export const selectGameSchema = createSelectSchema(games);

export type Game = z.infer<typeof selectGameSchema>;
export type NewGame = z.infer<typeof insertGameSchema>;

// Client type (omits sync/internal fields)
export type ClientGame = Omit<Game, 'installId' | 'deletedAt'>;
