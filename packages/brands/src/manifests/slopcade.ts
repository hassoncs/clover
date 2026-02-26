import type { BrandManifest } from "../types";

/**
 * Slopcade Brand Manifest
 *
 * The default brand - irreverent, chaotic, fun party games for everyone.
 */
export const slopcadeManifest: BrandManifest = {
	id: "slopcade",
	displayName: "Slopcade",
	legalName: "Slopcade",
	domain: "slopcade.com",
	tagline: "Party games for everyone",

	ios: {
		bundleIdentifier: "me.ch5.slopcade.app",
	},
	android: {
		package: "me.ch5.slopcade.app",
	},
	scheme: "slopcade",

	auth: {
		supabaseUrl: "SLOPCADE_SUPABASE_URL",
		supabaseAnonKey: "SLOPCADE_SUPABASE_ANON_KEY",
		providers: ["google"],
	},

	theme: {
		colors: {
			primary: "#0ea5e9",
			secondary: "#64748b",
			accent: "#8b5cf6",
			background: "#ffffff",
			surface: "#ffffff",
			text: "#111827",
			textSecondary: "#6b7280",
			error: "#ef4444",
			success: "#10b981",
		},
		fontFamily: {
			heading: "Inter",
			body: "Inter",
		},
		borderRadius: "rounded",
		iconStyle: "filled",
	},

	content: {
		ageRating: "mature",
		toneDirective: "Irreverent, chaotic, fun",
		requireScriptureRef: false,
		bannedCategories: [],
		denominationalPolicy: "none",
		defaultContentNamespace: "slopcade",
	},

	termsUrl: "https://slopcade.com/terms",
	privacyUrl: "https://slopcade.com/privacy",
	supportEmail: "support@slopcade.com",
	appStoreReviewUrl: "https://apps.apple.com/app/slopcade/id6744387937",

	monetization: {
		hasIndividualSub: true,
		hasOrgSub: false,
		freeGamesPerWeek: 0,
		trialDays: 0,
	},
	features: {
		hasEditor: true,
		hasGameBuilder: true,
		hasShaderEditor: true,
		hasSocialFeed: true,
		hasAIChat: true,
		hasPartyGames: false,
	},
};
