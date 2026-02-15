import type { TransactionType, WalletService } from "@/economy/wallet-service";

type D1Database = import("@cloudflare/workers-types").D1Database;

export const STIPEND_MAX_MICROS = 10_000_000;
export const STIPEND_CEILING_MICROS = 15_000_000;

interface StipendResult {
	granted: boolean;
	grantedMicros: number;
	newBalanceMicros: number;
}

export class StipendService {
	constructor(
		private walletService: WalletService,
		private db: D1Database,
	) {}

	async creditMonthlyStipend(
		userId: string,
		invoiceId: string,
	): Promise<StipendResult> {
		const wallet = await this.db
			.prepare("SELECT balance_micros FROM user_wallets WHERE user_id = ?")
			.bind(userId)
			.first<{ balance_micros: number | null }>();

		const currentBalanceMicros = wallet?.balance_micros ?? 0;
		const grantMicros = Math.min(
			STIPEND_MAX_MICROS,
			Math.max(0, STIPEND_CEILING_MICROS - currentBalanceMicros),
		);

		if (grantMicros <= 0) {
			return {
				granted: false,
				grantedMicros: 0,
				newBalanceMicros: currentBalanceMicros,
			};
		}

		const newBalanceMicros = await this.walletService.credit({
			userId,
			type: "subscription_stipend" as TransactionType,
			amountMicros: grantMicros,
			referenceType: "stripe_invoice",
			referenceId: invoiceId,
			idempotencyKey: `stipend_${userId}_${invoiceId}`,
			description: "Stripe Pro monthly stipend",
			metadata: {
				invoiceId,
				grantMicros,
				stipendMaxMicros: STIPEND_MAX_MICROS,
				stipendCeilingMicros: STIPEND_CEILING_MICROS,
			},
		});

		return {
			granted: true,
			grantedMicros: grantMicros,
			newBalanceMicros,
		};
	}
}
