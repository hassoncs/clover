import type { BrandManifest } from "../types";

/**
 * Amen Brand Manifest
 *
 * Scripture. Fellowship. Fun. - Reverent, educational Christian party games.
 */
export const amenManifest: BrandManifest = {
	id: "amen",
	displayName: "Amen",
	legalName: "Amen Games",
	domain: "amen.games",
	tagline: "Scripture. Fellowship. Fun.",

	ios: {
		bundleIdentifier: "games.amen.app",
	},
	android: {
		package: "games.amen.app",
	},
	scheme: "amen",

	auth: {
		supabaseUrl: "AMEN_SUPABASE_URL",
		supabaseAnonKey: "AMEN_SUPABASE_ANON_KEY",
		providers: ["google", "apple", "email"],
	},

	theme: {
		colors: {
			primary: "#1B3A6B",
			secondary: "#C9A84C",
			accent: "#6B3FA0",
			background: "#FDF8F0",
			surface: "#FFFFFF",
			text: "#2D2D2D",
			textSecondary: "#6B7280",
			error: "#B84233",
			success: "#5B7F3B",
		},
		fontFamily: {
			heading: "Lora",
			body: "Inter",
		},
		borderRadius: "rounded",
		iconStyle: "outlined",
	},

	content: {
		ageRating: "everyone",
		toneDirective:
			"Reverent, educational, warm. Never mocking or irreverent toward faith.",
		requireScriptureRef: true,
		bannedCategories: ["violence", "romance", "politics", "horror", "occult"],
		denominationalPolicy: "ecumenical",
		defaultContentNamespace: "amen",
	},

	features: {
		gameEditor: false,
		userGeneratedContent: false,
		aiGeneration: false,
		organizations: true,
		partyGamesOnly: true,
		socialFeed: false,
	},

	termsUrl: "https://amen.games/terms",
	privacyUrl: "https://amen.games/privacy",
	supportEmail: "support@amen.games",
	appStoreReviewUrl: "",

	monetization: {
		hasIndividualSub: true,
		hasOrgSub: true,
		freeGamesPerWeek: 2,
		trialDays: 14,
	},
};
