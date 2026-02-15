import { EntitlementService } from "./entitlement-service";
import { getTierLimits } from "./subscription-tiers";

type D1Database = import("@cloudflare/workers-types").D1Database;

interface HostingCheckResult {
	allowed: boolean;
	reason?: string;
	sessionsThisMonth: number;
	limit: number | null;
	maxPlayers: number;
}

export class PartyHostingGuard {
	constructor(private db: D1Database) {}

	async checkHostingAllowed(userId: string): Promise<HostingCheckResult> {
		const entitlementService = new EntitlementService(this.db);
		const entitlement = await entitlementService.resolveEntitlement(userId);
		const limits = getTierLimits(entitlement.isPro);

		const monthStart = getMonthStartMs();
		const row = await this.db
			.prepare(
				"SELECT COUNT(*) as count FROM party_hosting_sessions WHERE user_id = ? AND created_at >= ?",
			)
			.bind(userId, monthStart)
			.first<{ count: number }>();

		const sessionsThisMonth = row?.count ?? 0;

		if (
			limits.partyHostingsPerMonth !== null &&
			sessionsThisMonth >= limits.partyHostingsPerMonth
		) {
			return {
				allowed: false,
				reason: `Free plan limited to ${limits.partyHostingsPerMonth} party sessions per month. Upgrade to Pro for unlimited hosting.`,
				sessionsThisMonth,
				limit: limits.partyHostingsPerMonth,
				maxPlayers: limits.maxPlayersPerParty,
			};
		}

		return {
			allowed: true,
			sessionsThisMonth,
			limit: limits.partyHostingsPerMonth,
			maxPlayers: limits.maxPlayersPerParty,
		};
	}

	async recordHostingSession(userId: string, roomCode: string): Promise<void> {
		await this.db
			.prepare(
				"INSERT INTO party_hosting_sessions (user_id, room_code, created_at) VALUES (?, ?, ?)",
			)
			.bind(userId, roomCode, Date.now())
			.run();
	}
}

function getMonthStartMs(): number {
	const now = new Date();
	return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}
