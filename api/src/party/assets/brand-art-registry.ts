import {
	AMEN_AVATAR_ICON_PROMPTS,
	AMEN_GAME_ASSET_PROMPTS,
	AMEN_GAME_IDS,
} from "./amen-game-art-prompts";
import {
	SLOPBOX_AVATAR_ICON_PROMPTS,
	SLOPBOX_GAME_ASSET_PROMPTS,
	SLOPBOX_GAME_IDS,
} from "./slopbox-game-art-prompts";

export type AssetType =
	| "tiles"
	| "heroes"
	| "avatars"
	| "panels"
	| "voiceovers";

export const ALL_ASSET_TYPES: AssetType[] = [
	"tiles",
	"heroes",
	"avatars",
	"panels",
	"voiceovers",
];

export interface GameAssetPrompt {
	gameId: string;
	displayName: string;
	artDirection: string;
	tilePrompt: string;
	heroPrompt: string;
	panelPrompts: [string, string, string, string];
	voiceoverScript: string;
}

export interface BrandArtConfig {
	brandId: string;
	gameIds: readonly string[];
	gamePrompts: Record<string, GameAssetPrompt>;
	avatarPrompts: Record<string, string>;
	defaultAssetHost: string;
	supportsVoiceovers: boolean;
}

const BRAND_ART_CONFIGS: Record<string, BrandArtConfig> = {
	amen: {
		brandId: "amen",
		gameIds: AMEN_GAME_IDS,
		gamePrompts: AMEN_GAME_ASSET_PROMPTS as unknown as Record<
			string,
			GameAssetPrompt
		>,
		avatarPrompts: AMEN_AVATAR_ICON_PROMPTS as unknown as Record<
			string,
			string
		>,
		defaultAssetHost: "https://assets.amen.games",
		supportsVoiceovers: true,
	},
	slopbox: {
		brandId: "slopbox",
		gameIds: SLOPBOX_GAME_IDS,
		gamePrompts: SLOPBOX_GAME_ASSET_PROMPTS as unknown as Record<
			string,
			GameAssetPrompt
		>,
		avatarPrompts: SLOPBOX_AVATAR_ICON_PROMPTS as unknown as Record<
			string,
			string
		>,
		defaultAssetHost: "https://assets.slopbox.tv",
		supportsVoiceovers: false,
	},
};

export function getBrandArtConfig(brandId: string): BrandArtConfig {
	const cfg = BRAND_ART_CONFIGS[brandId];
	if (!cfg) {
		const available = Object.keys(BRAND_ART_CONFIGS).join(", ");
		throw new Error(
			`Unknown brand art config: "${brandId}". Available: ${available}`,
		);
	}
	return cfg;
}

export function listBrandIds(): string[] {
	return Object.keys(BRAND_ART_CONFIGS);
}
