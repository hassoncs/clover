import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from './users';

export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(),
  reporterId: text('reporter_id').notNull().references(() => users.id),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  reason: text('reason').notNull(),
  description: text('description'),
  status: text('status').notNull().default('pending'),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  statusIdx: index('idx_reports_status').on(table.status, table.createdAt),
  reporterIdx: index('idx_reports_reporter').on(table.reporterId),
}));

export const insertReportSchema = createInsertSchema(reports);
export const selectReportSchema = createSelectSchema(reports);
export type Report = z.infer<typeof selectReportSchema>;
export type NewReport = z.infer<typeof insertReportSchema>;

export const blocks = sqliteTable('blocks', {
  id: text('id').primaryKey(),
  blockerId: text('blocker_id').notNull().references(() => users.id),
  blockedId: text('blocked_id').notNull().references(() => users.id),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  uniqueBlock: uniqueIndex('idx_blocks_unique').on(table.blockerId, table.blockedId),
  blockerIdx: index('idx_blocks_blocker').on(table.blockerId),
}));

export const insertBlockSchema = createInsertSchema(blocks);
export const selectBlockSchema = createSelectSchema(blocks);
export type Block = z.infer<typeof selectBlockSchema>;
export type NewBlock = z.infer<typeof insertBlockSchema>;
