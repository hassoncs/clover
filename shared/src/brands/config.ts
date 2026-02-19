export interface BrandConfig {
	id: string;
	displayName: string;
	domain: string;
	supportEmail: string;
	tagline: string;
	colors: {
		primary: string;
		primaryLight: string;
		accent: string;
		background: string;
		surface: string;
		border: string;
		textPrimary: string;
		textSecondary: string;
	};
}

const AMEN_BRAND: BrandConfig = {
	id: "amen",
	displayName: "Amen",
	domain: "amen.games",
	supportEmail: "support@amen.games",
	tagline: "Scripture. Fellowship. Fun.",
	colors: {
		primary: "#C9A84C",
		primaryLight: "#E8D5A0",
		accent: "#0A1833",
		background: "#0D1C33",
		surface: "#0F2347",
		border: "rgba(201, 168, 76, 0.3)",
		textPrimary: "#FFFDF7",
		textSecondary: "rgba(255, 253, 247, 0.5)",
	},
};

const SLOPCADE_BRAND: BrandConfig = {
	id: "slopcade",
	displayName: "Slopcade",
	domain: "slopcade.com",
	supportEmail: "support@slopcade.com",
	tagline: "The Arcade",
	colors: {
		primary: "#6366F1",
		primaryLight: "#A5B4FC",
		accent: "#A855F7",
		background: "#0A0A1A",
		surface: "#1A1A2E",
		border: "rgba(99, 102, 241, 0.25)",
		textPrimary: "#FFFFFF",
		textSecondary: "rgba(255, 255, 255, 0.5)",
	},
};

const BRANDS: Record<string, BrandConfig> = {
	amen: AMEN_BRAND,
	slopcade: SLOPCADE_BRAND,
};

export function getBrandConfig(brandId: string): BrandConfig {
	const config = BRANDS[brandId];
	if (!config) {
		throw new Error(
			`Unknown brand: "${brandId}". Available: ${Object.keys(BRANDS).join(", ")}`,
		);
	}
	return config;
}

export function listBrandConfigs(): BrandConfig[] {
	return Object.values(BRANDS);
}
