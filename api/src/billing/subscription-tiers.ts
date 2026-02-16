export type SubscriptionTier = "free" | "pro";

export interface TierLimits {
	margin: number;
	partyHostingsPerMonth: number | null;
	maxPlayersPerParty: number;
	generationPriority: number;
	assetStoreCreatorSplit: number;
	assetStorePlatformSplit: number;
	canSetAssetsPrivate: boolean;
	canCloudSync: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
	free: {
		margin: 2.0,
		partyHostingsPerMonth: 3,
		maxPlayersPerParty: 4,
		generationPriority: 0,
		assetStoreCreatorSplit: 0.8,
		assetStorePlatformSplit: 0.2,
		canSetAssetsPrivate: false,
		canCloudSync: false,
	},
	pro: {
		margin: 1.5,
		partyHostingsPerMonth: null,
		maxPlayersPerParty: 12,
		generationPriority: 1,
		assetStoreCreatorSplit: 0.85,
		assetStorePlatformSplit: 0.15,
		canSetAssetsPrivate: true,
		canCloudSync: true,
	},
};

export const AMEN_INDIVIDUAL_TIERS = {
	amen_plus_monthly: { name: "Amen+ Monthly", price: 499, interval: "month" },
	amen_plus_yearly: {
		name: "Amen+ Yearly",
		price: 3999,
		interval: "year",
		savings: "33%",
	},
};

export function getTierLimits(isPro: boolean): TierLimits {
	return TIER_LIMITS[isPro ? "pro" : "free"];
}
