import {
  router,
  publicProcedure,
  protectedProcedure,
} from '../index'
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  CommentService,
  CommentNotFoundError,
  CommentValidationError,
  CommentPermissionError,
} from '@/social/comment-service';
import {
  RatingService,
  RatingValidationError,
} from '@/social/rating-service';
import { FollowService } from '@/social/follow-service';
import { BookmarkService } from '@/social/bookmark-service';
import { BlockService } from '@/social/block-service';
import { NotificationService } from '@/social/notification-service';

type D1 = import('@cloudflare/workers-types').D1Database;

function getCommentService(db: D1) { return new CommentService(db); }
function getRatingService(db: D1) { return new RatingService(db); }
function getFollowService(db: D1) { return new FollowService(db); }
function getBookmarkService(db: D1) { return new BookmarkService(db); }
function getNotificationService(db: D1) { return new NotificationService(db); }

export const socialRouter = router({
  // ─── Comments ─────────────────────────────────────────────

  addComment: protectedProcedure
    .input(z.object({
      gameId: z.string(),
      body: z.string().min(1).max(2000),
      bodyJson: z.string().optional(),
      parentId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const svc = getCommentService(ctx.env.DB);
      try {
        const comment = await svc.createComment({
          gameId: input.gameId,
          userId: ctx.user.id,
          body: input.body,
          bodyJson: input.bodyJson,
          parentId: input.parentId,
        });

        const notifSvc = getNotificationService(ctx.env.DB);
        if (input.parentId) {
          const parent = await ctx.env.DB
            .prepare('SELECT user_id FROM comments WHERE id = ?')
            .bind(input.parentId)
            .first<{ user_id: string }>();
          if (parent && parent.user_id !== ctx.user.id) {
            await notifSvc.createNotification({
              userId: parent.user_id,
              type: 'comment_reply',
              actorId: ctx.user.id,
              targetType: 'comment',
              targetId: input.parentId,
              gameId: input.gameId,
              message: `replied to your comment`,
            }).catch(() => {});
          }
        } else {
          const game = await ctx.env.DB
            .prepare('SELECT user_id FROM games WHERE id = ?')
            .bind(input.gameId)
            .first<{ user_id: string | null }>();
          if (game?.user_id && game.user_id !== ctx.user.id) {
            await notifSvc.createNotification({
              userId: game.user_id,
              type: 'comment',
              actorId: ctx.user.id,
              targetType: 'game',
              targetId: input.gameId,
              gameId: input.gameId,
              message: `commented on your game`,
            }).catch(() => {});
          }
        }

        return comment;
      } catch (e) {
        if (e instanceof CommentNotFoundError) throw new TRPCError({ code: 'NOT_FOUND', message: e.message });
        if (e instanceof CommentValidationError) throw new TRPCError({ code: 'BAD_REQUEST', message: e.message });
        throw e;
      }
    }),

  listComments: publicProcedure
    .input(z.object({
      gameId: z.string(),
      parentId: z.string().optional(),
      limit: z.number().min(1).max(50).default(20),
      cursor: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const svc = getCommentService(ctx.env.DB);
      const userId = (ctx as { user?: { id: string } }).user?.id;
      const result = await svc.listComments({
        gameId: input.gameId,
        parentId: input.parentId,
        limit: input.limit,
        cursor: input.cursor,
        userId,
      });

      if (userId) {
        const blockedIds = await new BlockService(ctx.env.DB).getBlockedIds(userId);
        if (blockedIds.length > 0) {
          const blockedSet = new Set(blockedIds);
          result.comments = result.comments.filter(c => !blockedSet.has(c.userId));
        }
      }

      return result;
    }),

  editComment: protectedProcedure
    .input(z.object({
      commentId: z.string(),
      body: z.string().min(1).max(2000),
      bodyJson: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const svc = getCommentService(ctx.env.DB);
      try {
        return await svc.editComment(input.commentId, ctx.user.id, input.body, input.bodyJson);
      } catch (e) {
        if (e instanceof CommentNotFoundError) throw new TRPCError({ code: 'NOT_FOUND', message: e.message });
        if (e instanceof CommentPermissionError) throw new TRPCError({ code: 'FORBIDDEN', message: e.message });
        throw e;
      }
    }),

  deleteComment: protectedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const svc = getCommentService(ctx.env.DB);
      try {
        await svc.deleteComment(input.commentId, ctx.user.id);
        return { deleted: true };
      } catch (e) {
        if (e instanceof CommentNotFoundError) throw new TRPCError({ code: 'NOT_FOUND', message: e.message });
        if (e instanceof CommentPermissionError) throw new TRPCError({ code: 'FORBIDDEN', message: e.message });
        throw e;
      }
    }),

  // ─── Reactions ────────────────────────────────────────────

  addReaction: protectedProcedure
    .input(z.object({
      targetType: z.enum(['game', 'comment']),
      targetId: z.string(),
      reactionType: z.string().default('like'),
    }))
    .mutation(async ({ ctx, input }) => {
      const svc = getCommentService(ctx.env.DB);
      const result = await svc.addReaction(ctx.user.id, input.targetType, input.targetId, input.reactionType);

      if (result.added) {
        const notifSvc = getNotificationService(ctx.env.DB);
        let ownerId: string | null = null;

        if (input.targetType === 'game') {
          const game = await ctx.env.DB
            .prepare('SELECT user_id FROM games WHERE id = ?')
            .bind(input.targetId)
            .first<{ user_id: string | null }>();
          ownerId = game?.user_id ?? null;
        } else {
          const comment = await ctx.env.DB
            .prepare('SELECT user_id, game_id FROM comments WHERE id = ?')
            .bind(input.targetId)
            .first<{ user_id: string; game_id: string }>();
          ownerId = comment?.user_id ?? null;
        }

        if (ownerId && ownerId !== ctx.user.id) {
          await notifSvc.createNotification({
            userId: ownerId,
            type: 'like',
            actorId: ctx.user.id,
            targetType: input.targetType,
            targetId: input.targetId,
            message: `liked your ${input.targetType}`,
          }).catch(() => {});
        }
      }

      return result;
    }),

  removeReaction: protectedProcedure
    .input(z.object({
      targetType: z.enum(['game', 'comment']),
      targetId: z.string(),
      reactionType: z.string().default('like'),
    }))
    .mutation(async ({ ctx, input }) => {
      const svc = getCommentService(ctx.env.DB);
      return svc.removeReaction(ctx.user.id, input.targetType, input.targetId, input.reactionType);
    }),

  getReactionStatus: publicProcedure
    .input(z.object({
      targetType: z.enum(['game', 'comment']),
      targetIds: z.array(z.string()).max(50),
    }))
    .query(async ({ ctx, input }) => {
      const userId = (ctx as { user?: { id: string } }).user?.id;
      if (!userId) return {};
      const svc = getCommentService(ctx.env.DB);
      return svc.getReactionStatus(userId, input.targetType, input.targetIds);
    }),

  // ─── Ratings ──────────────────────────────────────────────

  rateGame: protectedProcedure
    .input(z.object({
      gameId: z.string(),
      score: z.number().int().min(1).max(5),
    }))
    .mutation(async ({ ctx, input }) => {
      const svc = getRatingService(ctx.env.DB);
      try {
        return await svc.rate(input.gameId, ctx.user.id, input.score);
      } catch (e) {
        if (e instanceof RatingValidationError) throw new TRPCError({ code: 'BAD_REQUEST', message: e.message });
        throw e;
      }
    }),

  getRating: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .query(async ({ ctx, input }) => {
      const svc = getRatingService(ctx.env.DB);
      const userId = (ctx as { user?: { id: string } }).user?.id;
      return svc.getSummary(input.gameId, userId);
    }),

  // ─── Follows ──────────────────────────────────────────────

  follow: protectedProcedure
    .input(z.object({
      targetType: z.enum(['user', 'game']),
      targetId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const svc = getFollowService(ctx.env.DB);
      const result = await svc.follow(ctx.user.id, input.targetType, input.targetId);

      if (result.followed && input.targetType === 'user') {
        const notifSvc = getNotificationService(ctx.env.DB);
        await notifSvc.createNotification({
          userId: input.targetId,
          type: 'follow',
          actorId: ctx.user.id,
          message: `started following you`,
        }).catch(() => {});
      }

      return result;
    }),

  unfollow: protectedProcedure
    .input(z.object({
      targetType: z.enum(['user', 'game']),
      targetId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const svc = getFollowService(ctx.env.DB);
      return svc.unfollow(ctx.user.id, input.targetType, input.targetId);
    }),

  isFollowing: publicProcedure
    .input(z.object({
      targetType: z.enum(['user', 'game']),
      targetIds: z.array(z.string()).max(50),
    }))
    .query(async ({ ctx, input }) => {
      const userId = (ctx as { user?: { id: string } }).user?.id;
      if (!userId) return {};
      const svc = getFollowService(ctx.env.DB);
      return svc.isFollowing(userId, input.targetType, input.targetIds);
    }),

  getUserProfile: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = ctx.env.DB;
      const [userRow, followSvc] = [
        await db.prepare('SELECT id, display_name, avatar_url, bio, created_at FROM users WHERE id = ?')
          .bind(input.userId)
          .first<{ id: string; display_name: string | null; avatar_url: string | null; bio: string | null; created_at: number }>(),
        getFollowService(db),
      ];

      if (!userRow) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });

      const [counts, games] = await Promise.all([
        followSvc.getUserFollowCounts(input.userId),
        db.prepare(`
          SELECT id, title, description, thumbnail_url, play_count, like_count, comment_count,
                 rating_average, rating_count, created_at
          FROM games
          WHERE user_id = ? AND is_public = 1 AND deleted_at IS NULL
          ORDER BY created_at DESC
          LIMIT 50
        `).bind(input.userId).all<{
          id: string; title: string; description: string | null; thumbnail_url: string | null;
          play_count: number; like_count: number; comment_count: number;
          rating_average: number; rating_count: number; created_at: number;
        }>(),
      ]);

      const currentUserId = (ctx as { user?: { id: string } }).user?.id;
      let isFollowing = false;
      if (currentUserId && currentUserId !== input.userId) {
        const status = await followSvc.isFollowing(currentUserId, 'user', [input.userId]);
        isFollowing = status[input.userId] ?? false;
      }

      return {
        id: userRow.id,
        displayName: userRow.display_name,
        avatarUrl: userRow.avatar_url,
        bio: userRow.bio,
        createdAt: userRow.created_at,
        followerCount: counts.followerCount,
        followingCount: counts.followingCount,
        gameCount: (games.results ?? []).length,
        isFollowing,
        games: (games.results ?? []).map(g => ({
          id: g.id,
          title: g.title,
          description: g.description,
          thumbnailUrl: g.thumbnail_url,
          playCount: g.play_count,
          likeCount: g.like_count,
          commentCount: g.comment_count,
          ratingAverage: g.rating_average,
          ratingCount: g.rating_count,
          createdAt: g.created_at,
        })),
      };
    }),

  getFollowers: publicProcedure
    .input(z.object({ userId: z.string(), limit: z.number().default(20), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      const svc = getFollowService(ctx.env.DB);
      return svc.getFollowers(input.userId, input.limit, input.offset);
    }),

  getFollowing: publicProcedure
    .input(z.object({ userId: z.string(), limit: z.number().default(20), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      const svc = getFollowService(ctx.env.DB);
      return svc.getFollowing(input.userId, input.limit, input.offset);
    }),

  // ─── Bookmarks ────────────────────────────────────────────

  bookmark: protectedProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const svc = getBookmarkService(ctx.env.DB);
      return svc.bookmark(ctx.user.id, input.gameId);
    }),

  unbookmark: protectedProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const svc = getBookmarkService(ctx.env.DB);
      return svc.unbookmark(ctx.user.id, input.gameId);
    }),

  isBookmarked: publicProcedure
    .input(z.object({ gameIds: z.array(z.string()).max(50) }))
    .query(async ({ ctx, input }) => {
      const userId = (ctx as { user?: { id: string } }).user?.id;
      if (!userId) return {};
      const svc = getBookmarkService(ctx.env.DB);
      return svc.isBookmarked(userId, input.gameIds);
    }),

  listBookmarks: protectedProcedure
    .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      const svc = getBookmarkService(ctx.env.DB);
      return svc.listBookmarks(ctx.user.id, input.limit, input.offset);
    }),

  // ─── Social Feed ──────────────────────────────────────────

  feed: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = ctx.env.DB;
      const currentUserId = (ctx as { user?: { id: string } }).user?.id;

      let blockedFilter = '';
      const binds: (string | number)[] = [];

      if (currentUserId) {
        blockedFilter = 'AND (g.user_id IS NULL OR g.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?))';
        binds.push(currentUserId);
      }

      const result = await db.prepare(`
        SELECT g.id, g.title, g.description, g.thumbnail_url, g.play_count,
               g.like_count, g.comment_count, g.rating_average, g.rating_count,
               g.created_at, g.user_id,
               u.display_name as creator_name, u.avatar_url as creator_avatar
        FROM games g
        LEFT JOIN users u ON g.user_id = u.id
        WHERE g.is_public = 1 AND g.deleted_at IS NULL
        ${blockedFilter}
        ORDER BY g.created_at DESC
        LIMIT ? OFFSET ?
      `).bind(...binds, input.limit + 1, input.offset).all<{
        id: string; title: string; description: string | null; thumbnail_url: string | null;
        play_count: number; like_count: number; comment_count: number;
        rating_average: number; rating_count: number; created_at: number;
        user_id: string | null; creator_name: string | null; creator_avatar: string | null;
      }>();

      const rows = result.results ?? [];
      const hasMore = rows.length > input.limit;
      const page = hasMore ? rows.slice(0, input.limit) : rows;

      const gameIds = page.map(g => g.id);
      const creatorIds = [...new Set(page.map(g => g.user_id).filter(Boolean))] as string[];
      let likedSet = new Set<string>();
      let bookmarkedSet = new Set<string>();
      let followingSet = new Set<string>();

      if (currentUserId && gameIds.length > 0) {
        const [likes, bookmarks, follows] = await Promise.all([
          getCommentService(db).getReactionStatus(currentUserId, 'game', gameIds),
          getBookmarkService(db).isBookmarked(currentUserId, gameIds),
          creatorIds.length > 0
            ? getFollowService(db).isFollowing(currentUserId, 'user', creatorIds)
            : Promise.resolve({} as Record<string, boolean>),
        ]);
        likedSet = new Set(Object.entries(likes).filter(([, v]) => v).map(([k]) => k));
        bookmarkedSet = new Set(Object.entries(bookmarks).filter(([, v]) => v).map(([k]) => k));
        followingSet = new Set(Object.entries(follows).filter(([, v]) => v).map(([k]) => k));
      }

      return {
        games: page.map(g => ({
          id: g.id,
          title: g.title,
          description: g.description,
          thumbnailUrl: g.thumbnail_url,
          playCount: g.play_count,
          likeCount: g.like_count,
          commentCount: g.comment_count,
          ratingAverage: g.rating_average,
          ratingCount: g.rating_count,
          createdAt: g.created_at,
          creator: {
            id: g.user_id,
            displayName: g.creator_name,
            avatarUrl: g.creator_avatar,
          },
          isLiked: likedSet.has(g.id),
          isBookmarked: bookmarkedSet.has(g.id),
          isFollowingCreator: g.user_id ? followingSet.has(g.user_id) : false,
        })),
        hasMore,
      };
    }),
});
