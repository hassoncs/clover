import { ORG_SUBSCRIPTION_TIERS } from "@/billing/org-subscription-tiers";
import { adminProcedure, router } from "../index";

type TimeSeriesPoint = {
	date: string;
	count: number;
};

type GameTypePoint = {
	gameType: string;
	count: number;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function normalizeCount(value: number | string | null | undefined): number {
	if (typeof value === "number") {
		return value;
	}
	if (typeof value === "string") {
		return Number(value) || 0;
	}
	return 0;
}

export const monitoringRouter = router({
	getSignupVelocity: adminProcedure.query(async ({ ctx }) => {
		const now = Date.now();
		const sevenDaysAgo = now - 7 * ONE_DAY_MS;

		const perDayResult = await ctx.env.DB.prepare(
			`SELECT
				date(created_at / 1000, 'unixepoch') as date,
				COUNT(*) as count
			 FROM users
			 WHERE created_at >= ?
			 AND brand_id = ?
			 GROUP BY date(created_at / 1000, 'unixepoch')
			 ORDER BY date ASC`,
		)
			.bind(sevenDaysAgo, ctx.brandId)
			.all<TimeSeriesPoint>();

		const perHourResult = await ctx.env.DB.prepare(
			`SELECT
				strftime('%Y-%m-%d %H:00:00', created_at / 1000, 'unixepoch') as date,
				COUNT(*) as count
			 FROM users
			 WHERE created_at >= ?
			 AND brand_id = ?
			 GROUP BY strftime('%Y-%m-%d %H:00:00', created_at / 1000, 'unixepoch')
			 ORDER BY date ASC`,
		)
			.bind(sevenDaysAgo, ctx.brandId)
			.all<TimeSeriesPoint>();

		return {
			perDay: perDayResult.results.map((row) => ({
				date: row.date,
				count: normalizeCount(row.count),
			})),
			perHour: perHourResult.results.map((row) => ({
				date: row.date,
				count: normalizeCount(row.count),
			})),
		};
	}),

	getGameSessionStats: adminProcedure.query(async ({ ctx }) => {
		const now = Date.now();
		const sevenDaysAgo = now - 7 * ONE_DAY_MS;

		const perDayResult = await ctx.env.DB.prepare(
			`SELECT
				date(phs.created_at / 1000, 'unixepoch') as date,
				COUNT(*) as count
			 FROM party_hosting_sessions phs
			 INNER JOIN users u ON u.id = phs.user_id
			 WHERE phs.created_at >= ?
			 AND u.brand_id = ?
			 GROUP BY date(phs.created_at / 1000, 'unixepoch')
			 ORDER BY date ASC`,
		)
			.bind(sevenDaysAgo, ctx.brandId)
			.all<TimeSeriesPoint>();

		const perHourResult = await ctx.env.DB.prepare(
			`SELECT
				strftime('%Y-%m-%d %H:00:00', phs.created_at / 1000, 'unixepoch') as date,
				COUNT(*) as count
			 FROM party_hosting_sessions phs
			 INNER JOIN users u ON u.id = phs.user_id
			 WHERE phs.created_at >= ?
			 AND u.brand_id = ?
			 GROUP BY strftime('%Y-%m-%d %H:00:00', phs.created_at / 1000, 'unixepoch')
			 ORDER BY date ASC`,
		)
			.bind(sevenDaysAgo, ctx.brandId)
			.all<TimeSeriesPoint>();

		const byGameTypeResult = await ctx.env.DB.prepare(
			`SELECT
				CASE
					WHEN instr(phs.room_code, ':') > 0 THEN substr(phs.room_code, 1, instr(phs.room_code, ':') - 1)
					ELSE 'party_hosting'
				END as gameType,
				COUNT(*) as count
			 FROM party_hosting_sessions phs
			 INNER JOIN users u ON u.id = phs.user_id
			 WHERE phs.created_at >= ?
			 AND u.brand_id = ?
			 GROUP BY gameType
			 ORDER BY count DESC`,
		)
			.bind(sevenDaysAgo, ctx.brandId)
			.all<GameTypePoint>();

		return {
			perDay: perDayResult.results.map((row) => ({
				date: row.date,
				count: normalizeCount(row.count),
			})),
			perHour: perHourResult.results.map((row) => ({
				date: row.date,
				count: normalizeCount(row.count),
			})),
			byGameType: byGameTypeResult.results.map((row) => ({
				gameType: row.gameType,
				count: normalizeCount(row.count),
			})),
		};
	}),

	getOrgRegistrations: adminProcedure.query(async ({ ctx }) => {
		const now = Date.now();
		const sevenDaysAgo = now - 7 * ONE_DAY_MS;

		const perDayResult = await ctx.env.DB.prepare(
			`SELECT
				date(created_at / 1000, 'unixepoch') as date,
				COUNT(*) as count
			 FROM organizations
			 WHERE created_at >= ?
			 AND brand_id = ?
			 GROUP BY date(created_at / 1000, 'unixepoch')
			 ORDER BY date ASC`,
		)
			.bind(sevenDaysAgo, ctx.brandId)
			.all<TimeSeriesPoint>();

		return {
			perDay: perDayResult.results.map((row) => ({
				date: row.date,
				count: normalizeCount(row.count),
			})),
		};
	}),

	getActiveUsers: adminProcedure.query(async ({ ctx }) => {
		const now = Date.now();
		const oneDayAgo = now - ONE_DAY_MS;
		const sevenDaysAgo = now - 7 * ONE_DAY_MS;
		const thirtyDaysAgo = now - 30 * ONE_DAY_MS;

		const result = await ctx.env.DB.prepare(
			`WITH activity AS (
				SELECT ae.actor_id as user_id, ae.created_at as created_at
				FROM audit_events ae
				INNER JOIN users u ON u.id = ae.actor_id
				WHERE ae.created_at >= ?
				AND u.brand_id = ?
				UNION ALL
				SELECT phs.user_id as user_id, phs.created_at as created_at
				FROM party_hosting_sessions phs
				INNER JOIN users u ON u.id = phs.user_id
				WHERE phs.created_at >= ?
				AND u.brand_id = ?
				UNION ALL
				SELECT ct.user_id as user_id, ct.created_at as created_at
				FROM credit_transactions ct
				INNER JOIN users u ON u.id = ct.user_id
				WHERE ct.created_at >= ?
				AND u.brand_id = ?
				UNION ALL
				SELECT g.user_id as user_id, g.created_at as created_at
				FROM generations g
				INNER JOIN users u ON u.id = g.user_id
				WHERE g.created_at >= ?
				AND u.brand_id = ?
			)
			SELECT
				COUNT(DISTINCT CASE WHEN created_at >= ? THEN user_id END) as dau,
				COUNT(DISTINCT CASE WHEN created_at >= ? THEN user_id END) as wau,
				COUNT(DISTINCT CASE WHEN created_at >= ? THEN user_id END) as mau
			FROM activity`,
		)
			.bind(
				thirtyDaysAgo,
				ctx.brandId,
				thirtyDaysAgo,
				ctx.brandId,
				thirtyDaysAgo,
				ctx.brandId,
				thirtyDaysAgo,
				ctx.brandId,
				oneDayAgo,
				sevenDaysAgo,
				thirtyDaysAgo,
			)
			.first<{ dau: number; wau: number; mau: number }>();

		return {
			dau: normalizeCount(result?.dau),
			wau: normalizeCount(result?.wau),
			mau: normalizeCount(result?.mau),
		};
	}),

	getRevenueMetrics: adminProcedure.query(async ({ ctx }) => {
		const subscriptionCountsResult = await ctx.env.DB.prepare(
			`SELECT
				os.plan_id as planId,
				os.status as status,
				COUNT(*) as count
			 FROM org_subscriptions os
			 INNER JOIN organizations o ON o.id = os.org_id
			 WHERE o.brand_id = ?
			 GROUP BY os.plan_id, os.status
			 ORDER BY os.plan_id ASC, os.status ASC`,
		)
			.bind(ctx.brandId)
			.all<{ planId: string; status: string; count: number }>();

		let estimatedMrrCents = 0;
		for (const row of subscriptionCountsResult.results) {
			if (
				row.status !== "active" &&
				row.status !== "trialing" &&
				row.status !== "past_due"
			) {
				continue;
			}

			const tier =
				ORG_SUBSCRIPTION_TIERS[
					row.planId as keyof typeof ORG_SUBSCRIPTION_TIERS
				];
			if (!tier) {
				continue;
			}

			estimatedMrrCents += tier.priceMonthly * normalizeCount(row.count);
		}

		return {
			subscriptionCounts: subscriptionCountsResult.results.map((row) => ({
				planId: row.planId,
				status: row.status,
				count: normalizeCount(row.count),
			})),
			estimatedMrrCents,
			estimatedMrrDollars: estimatedMrrCents / 100,
		};
	}),

	getHealthCheck: adminProcedure.query(async ({ ctx }) => {
		const now = Date.now();
		const oneDayAgo = now - ONE_DAY_MS;
		const dbPingStartedAt = Date.now();

		await ctx.env.DB.prepare("SELECT id FROM users WHERE brand_id = ? LIMIT 1")
			.bind(ctx.brandId)
			.first<{ id: string }>();

		const dbResponseTimeMs = Date.now() - dbPingStartedAt;

		const errorRateResult = await ctx.env.DB.prepare(
			`SELECT
				COUNT(*) as totalEvents,
				SUM(
					CASE
						WHEN ae.action LIKE 'error.%' OR ae.action LIKE '%.error%' THEN 1
						ELSE 0
					END
				) as errorEvents
			 FROM audit_events ae
			 INNER JOIN users u ON u.id = ae.actor_id
			 WHERE ae.created_at >= ?
			 AND u.brand_id = ?`,
		)
			.bind(oneDayAgo, ctx.brandId)
			.first<{ totalEvents: number; errorEvents: number | null }>();

		const totalEvents = normalizeCount(errorRateResult?.totalEvents);
		const errorEvents = normalizeCount(errorRateResult?.errorEvents);

		return {
			status: "ok" as const,
			timestamp: now,
			database: {
				connected: true,
				responseTimeMs: dbResponseTimeMs,
			},
			errorRate24h: {
				totalEvents,
				errorEvents,
				errorRate: totalEvents > 0 ? errorEvents / totalEvents : 0,
			},
		};
	}),
});
