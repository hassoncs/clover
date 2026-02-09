import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from './users';

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  actorId: text('actor_id').notNull().references(() => users.id),
  targetType: text('target_type'),
  targetId: text('target_id'),
  gameId: text('game_id'),
  message: text('message'),
  isRead: integer('is_read').notNull().default(0),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  userIdx: index('idx_notifications_user').on(table.userId, table.isRead, table.createdAt),
  actorIdx: index('idx_notifications_actor').on(table.actorId),
}));

export const insertNotificationSchema = createInsertSchema(notifications);
export const selectNotificationSchema = createSelectSchema(notifications);
export type Notification = z.infer<typeof selectNotificationSchema>;
export type NewNotification = z.infer<typeof insertNotificationSchema>;
