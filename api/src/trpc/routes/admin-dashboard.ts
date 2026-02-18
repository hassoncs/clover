import { adminProcedure, router } from "../index";

export const adminDashboardRouter = router({
	getStats: adminProcedure.query(async ({ ctx }) => {
		const now = Date.now();
		const oneDayAgo = now - 24 * 60 * 60 * 1000;
		const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
		const startOfDay = new Date().setHours(0, 0, 0, 0);

		// 1. User Stats
		const totalUsersResult = await ctx.env.DB.prepare(
			"SELECT COUNT(*) as count FROM users",
		).first<{ count: number }>();

		const newUsersTodayResult = await ctx.env.DB.prepare(
			"SELECT COUNT(*) as count FROM users WHERE created_at >= ?",
		)
			.bind(startOfDay)
			.first<{ count: number }>();

		// 2. Spend Stats (Debit transactions are negative)
		const spend24hResult = await ctx.env.DB.prepare(
			"SELECT SUM(amount_micros) as total FROM credit_transactions WHERE amount_micros < 0 AND created_at >= ?",
		)
			.bind(oneDayAgo)
			.first<{ total: number }>();

		const spend7dResult = await ctx.env.DB.prepare(
			"SELECT SUM(amount_micros) as total FROM credit_transactions WHERE amount_micros < 0 AND created_at >= ?",
		)
			.bind(sevenDaysAgo)
			.first<{ total: number }>();

		const dailySpendResult = await ctx.env.DB.prepare(
			`SELECT 
        strftime('%Y-%m-%d', datetime(created_at / 1000, 'unixepoch')) as day, 
        SUM(amount_micros) as total 
      FROM credit_transactions
      WHERE amount_micros < 0 AND created_at >= ?
      GROUP BY day 
      ORDER BY day ASC`,
		)
			.bind(sevenDaysAgo)
			.all<{ day: string; total: number }>();

		const dailySpend = dailySpendResult.results.map((r) => ({
			day: r.day,
			amount: Math.abs(r.total),
		}));

		// 3. Moderation Rejects
		const moderationEvents = await ctx.env.DB.prepare(
			"SELECT metadata_json FROM audit_events WHERE action = 'moderation.reject' AND created_at >= ?",
		)
			.bind(oneDayAgo)
			.all<{ metadata_json: string }>();

		const moderationRejects: Record<string, number> = {};
		for (const event of moderationEvents.results) {
			try {
				const metadata = JSON.parse(event.metadata_json);
				const category = metadata.category || "UNKNOWN";
				moderationRejects[category] = (moderationRejects[category] || 0) + 1;
			} catch {
				// Ignore parse errors
			}
		}

		// 4. Generation Velocity (admin generation actions)
		const adminGenerationCountResult = await ctx.env.DB.prepare(
			"SELECT COUNT(*) as count FROM audit_events WHERE action LIKE 'admin.generate_%' AND created_at >= ?",
		)
			.bind(oneDayAgo)
			.first<{ count: number }>();

		// 5. User Generation Velocity (game generations)
		const userGenerationCountResult = await ctx.env.DB.prepare(
			"SELECT COUNT(*) as count FROM credit_transactions WHERE type = 'generation_debit' AND created_at >= ?",
		)
			.bind(oneDayAgo)
			.first<{ count: number }>();

		return {
			totalUsers: totalUsersResult?.count ?? 0,
			newUsersToday: newUsersTodayResult?.count ?? 0,
			spend24h: Math.abs(spend24hResult?.total ?? 0),
			spend7d: Math.abs(spend7dResult?.total ?? 0),
			dailySpend,
			adminGenerationCount24h: adminGenerationCountResult?.count ?? 0,
			userGenerationCount24h: userGenerationCountResult?.count ?? 0,
			moderationRejects24h: moderationRejects,
		};
	}),

	contentInventory: adminProcedure.query(async ({ ctx }) => {
		const db = ctx.env.DB;

		const rows = await db
			.prepare(
				`SELECT 
					pc.brand_id,
					pc.content_type,
					COUNT(*) as total,
					SUM(CASE WHEN pca.id IS NOT NULL THEN 1 ELSE 0 END) as has_audio,
					SUM(CASE WHEN pcr.id IS NOT NULL THEN 1 ELSE 0 END) as reviewed
				FROM party_content pc
				LEFT JOIN party_content_assets pca
					ON pca.content_id = pc.id AND pca.asset_type = 'audio' AND pca.deleted_at IS NULL
				LEFT JOIN party_content_reviews pcr
					ON pcr.content_id = pc.id
				WHERE pc.deleted_at IS NULL
				GROUP BY pc.brand_id, pc.content_type
				ORDER BY pc.brand_id, pc.content_type`,
			)
			.all<{
				brand_id: string;
				content_type: string;
				total: number;
				has_audio: number;
				reviewed: number;
			}>();

		return { rows: rows.results ?? [] };
	}),
});
