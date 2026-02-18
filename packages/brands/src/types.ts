/**
 * Brand Manifest Types
 *
 * Single source of truth for all brand configuration across the Slopcade multi-brand platform.
 */

export type BrandId = "slopcade" | "amen";

export interface BrandTheme {
	colors: {
		primary: string;
		secondary: string;
		accent: string;
		background: string;
		surface: string;
		text: string;
		textSecondary: string;
		error: string;
		success: string;
	};
	fontFamily: {
		heading: string;
		body: string;
	};
	borderRadius: "rounded" | "sharp";
	iconStyle: "outlined" | "filled";
}

export interface BrandContentPolicy {
	ageRating: "everyone" | "teen" | "mature";
	toneDirective: string;
	requireScriptureRef: boolean;
	bannedCategories: string[];
	denominationalPolicy: "ecumenical" | "none";
	defaultContentNamespace: string;
}

export interface BrandMonetization {
	hasIndividualSub: boolean;
	hasOrgSub: boolean;
	freeGamesPerWeek: number;
	trialDays: number;
}

export interface BrandManifest {
	id: BrandId;
	displayName: string;
	legalName: string;
	domain: string;
	tagline: string;

	// App Store Identity
	ios: {
		bundleIdentifier: string;
	};
	android: {
		package: string;
	};
	scheme: string;

	// Auth (separate Supabase project per brand)
	auth: {
		supabaseUrl: string;
		supabaseAnonKey: string;
		providers: ("google" | "apple" | "email")[];
	};

	// Visual Identity
	theme: BrandTheme;

	// Content Policy
	content: BrandContentPolicy;

	// Legal
	termsUrl: string;
	privacyUrl: string;
	supportEmail: string;
	appStoreReviewUrl?: string;

	// Monetization
	monetization: BrandMonetization;
}
