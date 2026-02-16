import { OrgEntitlementService } from "./org-entitlement-service";

type D1Database = import("@cloudflare/workers-types").D1Database;

export interface ProEntitlement {
	isPro: boolean;
	proUntil: number | null;
	source: "stripe" | "revenuecat" | "org" | null;
}

export class EntitlementService {
	constructor(
		private db: D1Database,
		private brandId?: string,
	) {}

	async resolveEntitlement(userId: string): Promise<ProEntitlement> {
		const row = await this.db
			.prepare(
				"SELECT pro_subscription_until, pro_source FROM users WHERE id = ?",
			)
			.bind(userId)
			.first<{
				pro_subscription_until: number | null;
				pro_source: string | null;
			}>();

		const proUntil = row?.pro_subscription_until ?? null;
		const source =
			row?.pro_source === "stripe" || row?.pro_source === "revenuecat"
				? row.pro_source
				: null;

		const hasIndividualEntitlement = proUntil !== null && proUntil > Date.now();
		if (hasIndividualEntitlement) {
			return {
				isPro: true,
				proUntil,
				source,
			};
		}

		if (!this.brandId) {
			return {
				isPro: false,
				proUntil,
				source,
			};
		}

		const orgEntitlementService = new OrgEntitlementService(
			this.db,
			this.brandId,
		);
		const orgEntitlement =
			await orgEntitlementService.resolveOrgEntitlement(userId);

		if (orgEntitlement.hasOrgEntitlement) {
			return {
				isPro: true,
				proUntil: null,
				source: "org",
			};
		}

		return {
			isPro: false,
			proUntil,
			source,
		};
	}

	async updateEntitlement(
		userId: string,
		proUntil: number,
		source: "stripe" | "revenuecat",
	): Promise<void> {
		await this.db
			.prepare(
				"UPDATE users SET pro_subscription_until = ?, pro_source = ? WHERE id = ?",
			)
			.bind(proUntil, source, userId)
			.run();
	}

	async revokeEntitlement(userId: string): Promise<void> {
		await this.db
			.prepare("UPDATE users SET pro_subscription_until = NULL WHERE id = ?")
			.bind(userId)
			.run();
	}

	async linkStripeCustomer(
		userId: string,
		stripeCustomerId: string,
	): Promise<void> {
		await this.db
			.prepare("UPDATE users SET stripe_customer_id = ? WHERE id = ?")
			.bind(stripeCustomerId, userId)
			.run();
	}

	async getStripeCustomerId(userId: string): Promise<string | null> {
		const row = await this.db
			.prepare("SELECT stripe_customer_id FROM users WHERE id = ?")
			.bind(userId)
			.first<{ stripe_customer_id: string | null }>();

		return row?.stripe_customer_id ?? null;
	}
}
