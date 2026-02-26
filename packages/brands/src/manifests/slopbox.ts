import type { BrandManifest } from "../types";

export const slopboxManifest: BrandManifest = {
	id: "slopbox",
	displayName: "Slopbox",
	legalName: "Slopbox",
	domain: "slopbox.tv",
	tagline: "Party games. Pure chaos.",
	ios: { bundleIdentifier: "tv.slopbox.app" },
	android: { package: "tv.slopbox.app" },
	scheme: "slopbox",
	auth: {
		supabaseUrl: "SLOPBOX_SUPABASE_URL",
		supabaseAnonKey: "SLOPBOX_SUPABASE_ANON_KEY",
		providers: ["google", "apple"],
	},
	theme: {
		colors: {
			primary: "#f97316", // orange
			secondary: "#a855f7", // purple
			accent: "#22c55e", // green
			background: "#0f0f0f",
			surface: "#1a1a1a",
			text: "#f5f5f5",
			textSecondary: "#a3a3a3",
			error: "#ef4444",
			success: "#22c55e",
		},
		fontFamily: { heading: "Inter", body: "Inter" },
		borderRadius: "rounded",
		iconStyle: "filled",
	},
	content: {
		ageRating: "teen",
		toneDirective: "Chaotic, sloppy, irreverent party energy",
		requireScriptureRef: false,
		bannedCategories: ["violence", "horror"],
		denominationalPolicy: "none",
		defaultContentNamespace: "slopbox",
	},
	termsUrl: "https://slopbox.tv/terms",
	privacyUrl: "https://slopbox.tv/privacy",
	supportEmail: "support@slopbox.tv",
	monetization: {
		hasIndividualSub: false,
		hasOrgSub: false,
		freeGamesPerWeek: 99,
		trialDays: 0,
	},
	features: {
		hasEditor: false,
		hasGameBuilder: false,
		hasShaderEditor: false,
		hasSocialFeed: false,
		hasAIChat: false,
		hasPartyGames: true,
	},
};
