import { getBrandManifest } from "@slopcade/brands";
import { EntitlementService } from "./entitlement-service";
import { TIER_LIMITS } from "./subscription-tiers";

type D1Database = import("@cloudflare/workers-types").D1Database;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface FreeTierGuardResult {
	allowed: boolean;
	isPro: boolean;
	sessionsUsed: number;
	sessionsLimit: number;
	resetsAt: number;
	reason?: string;
}

interface SessionWindow {
	label: "week" | "month";
	windowStart: number;
	resetsAt: number;
	sessionsLimit: number;
}

export class FreeTierGuard {
	constructor(
		private db: D1Database,
		private brandId: string,
		private userId: string,
	) {}

	async check(): Promise<FreeTierGuardResult> {
		const entitlementService = new EntitlementService(this.db, this.brandId);
		const entitlement = await entitlementService.resolveEntitlement(
			this.userId,
		);
		const sessionWindow = getSessionWindow(this.brandId, Date.now());

		const row = await this.db
			.prepare(
				"SELECT COUNT(*) as count FROM party_hosting_sessions WHERE user_id = ? AND created_at >= ?",
			)
			.bind(this.userId, sessionWindow.windowStart)
			.first<{ count: number }>();

		const sessionsUsed = row?.count ?? 0;
		const allowed =
			entitlement.isPro || sessionsUsed < sessionWindow.sessionsLimit;

		if (!allowed) {
			return {
				allowed,
				isPro: entitlement.isPro,
				sessionsUsed,
				sessionsLimit: sessionWindow.sessionsLimit,
				resetsAt: sessionWindow.resetsAt,
				reason: `Free plan limited to ${sessionWindow.sessionsLimit} party sessions per ${sessionWindow.label}. Upgrade to Pro for unlimited hosting.`,
			};
		}

		return {
			allowed,
			isPro: entitlement.isPro,
			sessionsUsed,
			sessionsLimit: sessionWindow.sessionsLimit,
			resetsAt: sessionWindow.resetsAt,
		};
	}
}

function getSessionWindow(brandId: string, nowMs: number): SessionWindow {
	if (brandId === "amen") {
		const brand = getBrandManifest(brandId);
		const { windowStart, resetsAt } = getUtcWeekWindow(nowMs);
		return {
			label: "week",
			windowStart,
			resetsAt,
			sessionsLimit: brand.monetization.freeGamesPerWeek,
		};
	}

	const { windowStart, resetsAt } = getUtcMonthWindow(nowMs);
	return {
		label: "month",
		windowStart,
		resetsAt,
		sessionsLimit: TIER_LIMITS.free.partyHostingsPerMonth ?? 0,
	};
}

function getUtcWeekWindow(nowMs: number): {
	windowStart: number;
	resetsAt: number;
} {
	const now = new Date(nowMs);
	const dayOfWeek = now.getUTCDay();
	const daysSinceMonday = (dayOfWeek + 6) % 7;
	const windowStart = Date.UTC(
		now.getUTCFullYear(),
		now.getUTCMonth(),
		now.getUTCDate() - daysSinceMonday,
		0,
		0,
		0,
		0,
	);

	return {
		windowStart,
		resetsAt: windowStart + 7 * DAY_MS,
	};
}

function getUtcMonthWindow(nowMs: number): {
	windowStart: number;
	resetsAt: number;
} {
	const now = new Date(nowMs);
	const windowStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
	const resetsAt = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);

	return {
		windowStart,
		resetsAt,
	};
}
