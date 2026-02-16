import { adminProcedure, router } from "../index";

export const adminDashboardRouter = router({
	getStats: adminProcedure.query(async ({ ctx }) => {
		const now = Date.now();
		const oneDayAgo = now - 24 * 60 * 60 * 1000;
		const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
		const startOfDay = new Date().setHours(0, 0, 0, 0);

		// 1. User Stats
		const totalUsersResult = await ctx.env.DB.prepare(
			"SELECT COUNT(*) as count FROM users WHERE brand_id = ?",
		)
			.bind(ctx.brandId)
			.first<{ count: number }>();

		const newUsersTodayResult = await ctx.env.DB.prepare(
			"SELECT COUNT(*) as count FROM users WHERE created_at >= ? AND brand_id = ?",
		)
			.bind(startOfDay, ctx.brandId)
			.first<{ count: number }>();

		// 2. Spend Stats (Debit transactions are negative)
		const spend24hResult = await ctx.env.DB.prepare(
			"SELECT SUM(ct.amount_micros) as total FROM credit_transactions ct JOIN users u ON ct.user_id = u.id WHERE ct.amount_micros < 0 AND ct.created_at >= ? AND u.brand_id = ?",
		)
			.bind(oneDayAgo, ctx.brandId)
			.first<{ total: number }>();

		const spend7dResult = await ctx.env.DB.prepare(
			"SELECT SUM(ct.amount_micros) as total FROM credit_transactions ct JOIN users u ON ct.user_id = u.id WHERE ct.amount_micros < 0 AND ct.created_at >= ? AND u.brand_id = ?",
		)
			.bind(sevenDaysAgo, ctx.brandId)
			.first<{ total: number }>();

		const dailySpendResult = await ctx.env.DB.prepare(
			`SELECT 
        strftime('%Y-%m-%d', datetime(ct.created_at / 1000, 'unixepoch')) as day, 
        SUM(ct.amount_micros) as total 
      FROM credit_transactions ct
      JOIN users u ON ct.user_id = u.id
      WHERE ct.amount_micros < 0 AND ct.created_at >= ? AND u.brand_id = ?
      GROUP BY day 
      ORDER BY day ASC`,
		)
			.bind(sevenDaysAgo, ctx.brandId)
			.all<{ day: string; total: number }>();

		const dailySpend = dailySpendResult.results.map((r) => ({
			day: r.day,
			amount: Math.abs(r.total),
		}));

		// 3. Moderation Rejects
		const moderationEvents = await ctx.env.DB.prepare(
			"SELECT ae.metadata_json FROM audit_events ae JOIN users u ON ae.actor_id = u.id WHERE ae.action = 'moderation.reject' AND ae.created_at >= ? AND u.brand_id = ?",
		)
			.bind(oneDayAgo, ctx.brandId)
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
			"SELECT COUNT(*) as count FROM audit_events ae JOIN users u ON ae.actor_id = u.id WHERE ae.action LIKE 'admin.generate_%' AND ae.created_at >= ? AND u.brand_id = ?",
		)
			.bind(oneDayAgo, ctx.brandId)
			.first<{ count: number }>();

		// 5. User Generation Velocity (game generations)
		const userGenerationCountResult = await ctx.env.DB.prepare(
			"SELECT COUNT(*) as count FROM credit_transactions ct JOIN users u ON ct.user_id = u.id WHERE ct.type = 'generation_debit' AND ct.created_at >= ? AND u.brand_id = ?",
		)
			.bind(oneDayAgo, ctx.brandId)
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
});
