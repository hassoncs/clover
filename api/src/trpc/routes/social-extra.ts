import { z } from "zod";
import { BookmarkService } from "@/social/bookmark-service";
import { CommentService } from "@/social/comment-service";
import { FollowService } from "@/social/follow-service";
import { protectedProcedure, publicProcedure, router } from "../index";

type D1 = import("@cloudflare/workers-types").D1Database;

function getCommentService(db: D1) {
	return new CommentService(db);
}
function getBookmarkService(db: D1) {
	return new BookmarkService(db);
}
function getFollowService(db: D1) {
	return new FollowService(db);
}

export const socialExtraRouter = router({
	// ─── Following Feed ────────────────────────────────────────

	followingFeed: protectedProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(50).default(20),
				offset: z.number().default(0),
			}),
		)
		.query(async ({ ctx, input }) => {
			const db = ctx.env.DB;
			const userId = ctx.user.id;

			const result = await db
				.prepare(`
        SELECT g.id, g.title, g.description, g.thumbnail_url, g.play_count,
               g.like_count, g.comment_count, g.rating_average, g.rating_count,
               g.created_at, g.user_id,
               u.display_name as creator_name, u.avatar_url as creator_avatar
        FROM games g
        LEFT JOIN users u ON g.user_id = u.id
        WHERE g.is_public = 1 AND g.deleted_at IS NULL AND g.brand_id = ?
          AND g.user_id IN (
            SELECT f.target_id
            FROM follows f
            INNER JOIN users u2 ON u2.id = f.target_id
            WHERE f.follower_id = ? AND f.target_type = 'user' AND u2.brand_id = ?
          )
          AND (g.user_id IS NULL OR g.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?))
        ORDER BY g.created_at DESC
        LIMIT ? OFFSET ?
      `)
				.bind(
					ctx.brandId,
					userId,
					ctx.brandId,
					userId,
					input.limit + 1,
					input.offset,
				)
				.all<{
					id: string;
					title: string;
					description: string | null;
					thumbnail_url: string | null;
					play_count: number;
					like_count: number;
					comment_count: number;
					rating_average: number;
					rating_count: number;
					created_at: number;
					user_id: string | null;
					creator_name: string | null;
					creator_avatar: string | null;
				}>();

			const rows = result.results ?? [];
			const hasMore = rows.length > input.limit;
			const page = hasMore ? rows.slice(0, input.limit) : rows;

			const gameIds = page.map((g) => g.id);
			const creatorIds = [
				...new Set(page.map((g) => g.user_id).filter(Boolean)),
			] as string[];

			let likedSet = new Set<string>();
			let bookmarkedSet = new Set<string>();
			let followingSet = new Set<string>();

			if (gameIds.length > 0) {
				const [likes, bookmarks, follows] = await Promise.all([
					getCommentService(db).getReactionStatus(userId, "game", gameIds),
					getBookmarkService(db).isBookmarked(userId, gameIds, ctx.brandId),
					creatorIds.length > 0
						? getFollowService(db).isFollowing(
								userId,
								"user",
								creatorIds,
								ctx.brandId,
							)
						: Promise.resolve({} as Record<string, boolean>),
				]);
				likedSet = new Set(
					Object.entries(likes)
						.filter(([, v]) => v)
						.map(([k]) => k),
				);
				bookmarkedSet = new Set(
					Object.entries(bookmarks)
						.filter(([, v]) => v)
						.map(([k]) => k),
				);
				followingSet = new Set(
					Object.entries(follows)
						.filter(([, v]) => v)
						.map(([k]) => k),
				);
			}

			return {
				games: page.map((g) => ({
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

	// ─── Search Users ──────────────────────────────────────────

	searchUsers: publicProcedure
		.input(
			z.object({
				query: z.string().min(1).max(100),
				limit: z.number().default(20),
				offset: z.number().default(0),
			}),
		)
		.query(async ({ ctx, input }) => {
			const db = ctx.env.DB;
			const pattern = `%${input.query}%`;

			const result = await db
				.prepare(
					`SELECT id, display_name, avatar_url FROM users WHERE display_name LIKE ? AND brand_id = ? LIMIT ? OFFSET ?`,
				)
				.bind(pattern, ctx.brandId, input.limit, input.offset)
				.all<{
					id: string;
					display_name: string | null;
					avatar_url: string | null;
				}>();

			const rows = result.results ?? [];

			const users = await Promise.all(
				rows.map(async (u) => {
					const [gameCountResult, followerCountResult] = await Promise.all([
						db
							.prepare(
								"SELECT COUNT(*) as count FROM games WHERE user_id = ? AND is_public = 1 AND deleted_at IS NULL AND brand_id = ?",
							)
							.bind(u.id, ctx.brandId)
							.first<{ count: number }>(),
						db
							.prepare(
								"SELECT COUNT(*) as count FROM follows f INNER JOIN users uf ON uf.id = f.follower_id WHERE f.target_id = ? AND f.target_type = ? AND uf.brand_id = ?",
							)
							.bind(u.id, "user", ctx.brandId)
							.first<{ count: number }>(),
					]);

					return {
						id: u.id,
						displayName: u.display_name,
						avatarUrl: u.avatar_url,
						gameCount: gameCountResult?.count ?? 0,
						followerCount: followerCountResult?.count ?? 0,
					};
				}),
			);

			return { users };
		}),

	// ─── Suggested Users ───────────────────────────────────────

	suggestedUsers: publicProcedure
		.input(
			z.object({
				limit: z.number().default(10),
			}),
		)
		.query(async ({ ctx, input }) => {
			const db = ctx.env.DB;
			const currentUserId = (ctx as { user?: { id: string } }).user?.id;

			let query: string;
			let binds: (string | number)[];

			if (currentUserId) {
				query = `
          SELECT u.id, u.display_name, u.avatar_url, COUNT(g.id) as game_count
          FROM users u
          LEFT JOIN games g ON g.user_id = u.id AND g.is_public = 1 AND g.deleted_at IS NULL AND g.brand_id = ?
          WHERE u.id != ? AND u.brand_id = ?
          GROUP BY u.id
          ORDER BY game_count DESC
          LIMIT ?
        `;
				binds = [ctx.brandId, currentUserId, ctx.brandId, input.limit];
			} else {
				query = `
          SELECT u.id, u.display_name, u.avatar_url, COUNT(g.id) as game_count
          FROM users u
          LEFT JOIN games g ON g.user_id = u.id AND g.is_public = 1 AND g.deleted_at IS NULL AND g.brand_id = ?
          WHERE u.brand_id = ?
          GROUP BY u.id
          ORDER BY game_count DESC
          LIMIT ?
        `;
				binds = [ctx.brandId, ctx.brandId, input.limit];
			}

			const result = await db
				.prepare(query)
				.bind(...binds)
				.all<{
					id: string;
					display_name: string | null;
					avatar_url: string | null;
					game_count: number;
				}>();

			const rows = result.results ?? [];

			const users = await Promise.all(
				rows.map(async (u) => {
					const followerCountResult = await db
						.prepare(
							"SELECT COUNT(*) as count FROM follows f INNER JOIN users uf ON uf.id = f.follower_id WHERE f.target_id = ? AND f.target_type = ? AND uf.brand_id = ?",
						)
						.bind(u.id, "user", ctx.brandId)
						.first<{ count: number }>();

					return {
						id: u.id,
						displayName: u.display_name,
						avatarUrl: u.avatar_url,
						gameCount: u.game_count,
						followerCount: followerCountResult?.count ?? 0,
					};
				}),
			);

			return { users };
		}),

	// ─── Get Likers ────────────────────────────────────────────

	getLikers: publicProcedure
		.input(
			z.object({
				targetType: z.enum(["game", "comment"]),
				targetId: z.string(),
				limit: z.number().default(20),
				offset: z.number().default(0),
			}),
		)
		.query(async ({ ctx, input }) => {
			const db = ctx.env.DB;

			const [result, totalResult] = await Promise.all([
				db
					.prepare(`
          SELECT u.id, u.display_name, u.avatar_url
          FROM reactions r
          JOIN users u ON r.user_id = u.id
          WHERE r.target_type = ? AND r.target_id = ? AND r.reaction_type = 'like' AND u.brand_id = ?
          ORDER BY r.created_at DESC
          LIMIT ? OFFSET ?
        `)
					.bind(
						input.targetType,
						input.targetId,
						ctx.brandId,
						input.limit,
						input.offset,
					)
					.all<{
						id: string;
						display_name: string | null;
						avatar_url: string | null;
					}>(),
				db
					.prepare(`
          SELECT COUNT(*) as count
          FROM reactions r
          JOIN users u ON r.user_id = u.id
          WHERE r.target_type = ? AND r.target_id = ? AND r.reaction_type = 'like' AND u.brand_id = ?
        `)
					.bind(input.targetType, input.targetId, ctx.brandId)
					.first<{ count: number }>(),
			]);

			const rows = result.results ?? [];

			return {
				users: rows.map((u) => ({
					id: u.id,
					displayName: u.display_name,
					avatarUrl: u.avatar_url,
				})),
				total: totalResult?.count ?? 0,
			};
		}),

	// ─── My Liked Games ────────────────────────────────────────

	myLikedGames: protectedProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(50).default(20),
				offset: z.number().default(0),
			}),
		)
		.query(async ({ ctx, input }) => {
			const db = ctx.env.DB;
			const userId = ctx.user.id;

			const result = await db
				.prepare(`
        SELECT g.id, g.title, g.thumbnail_url, g.play_count, g.like_count
        FROM reactions r
        JOIN games g ON r.target_id = g.id
        WHERE r.user_id = ? AND r.target_type = 'game' AND r.reaction_type = 'like'
          AND g.is_public = 1 AND g.deleted_at IS NULL AND g.brand_id = ?
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
      `)
				.bind(userId, ctx.brandId, input.limit + 1, input.offset)
				.all<{
					id: string;
					title: string;
					thumbnail_url: string | null;
					play_count: number;
					like_count: number;
				}>();

			const rows = result.results ?? [];
			const hasMore = rows.length > input.limit;
			const page = hasMore ? rows.slice(0, input.limit) : rows;

			return {
				games: page.map((g) => ({
					id: g.id,
					title: g.title,
					thumbnailUrl: g.thumbnail_url,
					playCount: g.play_count,
					likeCount: g.like_count,
				})),
				hasMore,
			};
		}),

	// ─── My Saved Games ────────────────────────────────────────

	mySavedGames: protectedProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(50).default(20),
				offset: z.number().default(0),
			}),
		)
		.query(async ({ ctx, input }) => {
			const db = ctx.env.DB;
			const userId = ctx.user.id;

			const result = await db
				.prepare(`
        SELECT g.id, g.title, g.thumbnail_url, g.play_count, g.like_count
        FROM bookmarks b
        JOIN games g ON b.game_id = g.id
        WHERE b.user_id = ?
          AND g.is_public = 1 AND g.deleted_at IS NULL AND g.brand_id = ?
        ORDER BY b.created_at DESC
        LIMIT ? OFFSET ?
      `)
				.bind(userId, ctx.brandId, input.limit + 1, input.offset)
				.all<{
					id: string;
					title: string;
					thumbnail_url: string | null;
					play_count: number;
					like_count: number;
				}>();

			const rows = result.results ?? [];
			const hasMore = rows.length > input.limit;
			const page = hasMore ? rows.slice(0, input.limit) : rows;

			return {
				games: page.map((g) => ({
					id: g.id,
					title: g.title,
					thumbnailUrl: g.thumbnail_url,
					playCount: g.play_count,
					likeCount: g.like_count,
				})),
				hasMore,
			};
		}),
});
