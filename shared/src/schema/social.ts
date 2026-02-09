import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from './users';

export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  gameId: text('game_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id),
  parentId: text('parent_id'),
  body: text('body').notNull(),
  bodyJson: text('body_json'),
  depth: integer('depth').notNull().default(0),
  replyCount: integer('reply_count').notNull().default(0),
  reactionCount: integer('reaction_count').notNull().default(0),
  isEdited: integer('is_edited').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
}, (table) => ({
  gameIdx: index('idx_comments_game').on(table.gameId, table.createdAt),
  parentIdx: index('idx_comments_parent').on(table.parentId, table.createdAt),
  userIdx: index('idx_comments_user').on(table.userId),
}));

export const insertCommentSchema = createInsertSchema(comments);
export const selectCommentSchema = createSelectSchema(comments);
export type Comment = z.infer<typeof selectCommentSchema>;
export type NewComment = z.infer<typeof insertCommentSchema>;

export const reactions = sqliteTable('reactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  reactionType: text('reaction_type').notNull().default('like'),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  uniqueReaction: uniqueIndex('idx_reactions_unique').on(table.userId, table.targetType, table.targetId, table.reactionType),
  targetIdx: index('idx_reactions_target').on(table.targetType, table.targetId),
  userIdx: index('idx_reactions_user').on(table.userId),
}));

export const insertReactionSchema = createInsertSchema(reactions);
export const selectReactionSchema = createSelectSchema(reactions);
export type Reaction = z.infer<typeof selectReactionSchema>;
export type NewReaction = z.infer<typeof insertReactionSchema>;

export const follows = sqliteTable('follows', {
  id: text('id').primaryKey(),
  followerId: text('follower_id').notNull().references(() => users.id),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  uniqueFollow: uniqueIndex('idx_follows_unique').on(table.followerId, table.targetType, table.targetId),
  followerIdx: index('idx_follows_follower').on(table.followerId, table.targetType),
  targetIdx: index('idx_follows_target').on(table.targetType, table.targetId),
}));

export const insertFollowSchema = createInsertSchema(follows);
export const selectFollowSchema = createSelectSchema(follows);
export type Follow = z.infer<typeof selectFollowSchema>;
export type NewFollow = z.infer<typeof insertFollowSchema>;

export const ratings = sqliteTable('ratings', {
  id: text('id').primaryKey(),
  gameId: text('game_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id),
  score: integer('score').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  gameUserUnique: uniqueIndex('idx_ratings_game_user').on(table.gameId, table.userId),
  gameIdx: index('idx_ratings_game').on(table.gameId),
  userIdx: index('idx_ratings_user').on(table.userId),
}));

export const insertRatingSchema = createInsertSchema(ratings);
export const selectRatingSchema = createSelectSchema(ratings);
export type Rating = z.infer<typeof selectRatingSchema>;
export type NewRating = z.infer<typeof insertRatingSchema>;

export const bookmarks = sqliteTable('bookmarks', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  gameId: text('game_id').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  userGameUnique: uniqueIndex('idx_bookmarks_user_game').on(table.userId, table.gameId),
  userIdx: index('idx_bookmarks_user').on(table.userId, table.createdAt),
  gameIdx: index('idx_bookmarks_game').on(table.gameId),
}));

export const insertBookmarkSchema = createInsertSchema(bookmarks);
export const selectBookmarkSchema = createSelectSchema(bookmarks);
export type Bookmark = z.infer<typeof selectBookmarkSchema>;
export type NewBookmark = z.infer<typeof insertBookmarkSchema>;
