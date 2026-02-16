import { FreeTierGuard } from "./free-tier-guard";
import { getTierLimits } from "./subscription-tiers";

type D1Database = import("@cloudflare/workers-types").D1Database;

interface HostingCheckResult {
	allowed: boolean;
	reason?: string;
	sessionsThisMonth: number;
	limit: number | null;
	maxPlayers: number;
	resetsAt: number;
}

export class PartyHostingGuard {
	constructor(
		private db: D1Database,
		private brandId: string = "slopcade",
	) {}

	async checkHostingAllowed(userId: string): Promise<HostingCheckResult> {
		const freeTierGuard = new FreeTierGuard(this.db, this.brandId, userId);
		const freeTierResult = await freeTierGuard.check();
		const limits = getTierLimits(freeTierResult.isPro);

		return {
			allowed: freeTierResult.allowed,
			reason: freeTierResult.reason,
			sessionsThisMonth: freeTierResult.sessionsUsed,
			limit: freeTierResult.isPro ? null : freeTierResult.sessionsLimit,
			maxPlayers: limits.maxPlayersPerParty,
			resetsAt: freeTierResult.resetsAt,
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
