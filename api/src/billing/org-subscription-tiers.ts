export interface OrgSubscriptionTier {
	name: string;
	maxAttendance: number;
	priceYearly: number;
	priceMonthly: number;
}

export const ORG_SUBSCRIPTION_TIERS = {
	amen_church_small: {
		name: "Small Church",
		maxAttendance: 100,
		priceYearly: 19900,
		priceMonthly: 2400,
	},
	amen_church_medium: {
		name: "Medium Church",
		maxAttendance: 500,
		priceYearly: 49900,
		priceMonthly: 5900,
	},
	amen_church_large: {
		name: "Large Church",
		maxAttendance: 2000,
		priceYearly: 99900,
		priceMonthly: 11900,
	},
} as const satisfies Record<string, OrgSubscriptionTier>;

export type OrgSubscriptionTierId = keyof typeof ORG_SUBSCRIPTION_TIERS;

export const ORG_SUBSCRIPTION_TIER_IDS = Object.keys(
	ORG_SUBSCRIPTION_TIERS,
) as OrgSubscriptionTierId[];
