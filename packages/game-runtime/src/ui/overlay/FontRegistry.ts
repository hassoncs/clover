import type { FontPreset } from "@slopcade/shared";
import Bangers from "../../../assets/fonts/Bangers-Regular.ttf";
import FredokaBold from "../../../assets/fonts/Fredoka-Bold.ttf";
import FredokaRegular from "../../../assets/fonts/Fredoka-Regular.ttf";
import PressStart2P from "../../../assets/fonts/PressStart2P-Regular.ttf";

export const BUNDLED_FONTS: Record<string, { normal: any; bold?: any }> = {
	PressStart2P: { normal: PressStart2P },
	Bangers: { normal: Bangers },
	Fredoka: { normal: FredokaRegular, bold: FredokaBold },
};

export interface FontAsset {
	name: string;
	source: "local" | "google" | "url";
	/** For local fonts, require the asset */
	localAsset?: number;
	/** For Google fonts, the font family name */
	googleFamily?: string;
	/** For URL fonts, the TTF/OTF URL */
	url?: string;
	/** Available weights */
	weights?: ("normal" | "bold")[];
}

/** Google Fonts that are commonly used for games */
export const GOOGLE_FONTS: Record<string, { normal: string; bold?: string }> = {
	PressStart2P: {
		normal:
			"https://github.com/google/fonts/raw/main/ofl/pressstart2p/PressStart2P-Regular.ttf",
	},
	Bangers: {
		normal:
			"https://github.com/google/fonts/raw/main/ofl/bangers/Bangers-Regular.ttf",
	},
	Modak: {
		normal:
			"https://github.com/google/fonts/raw/main/ofl/modak/Modak-Regular.ttf",
	},
	Fredoka: {
		normal:
			"https://github.com/google/fonts/raw/main/ofl/fredoka/Fredoka-Regular.ttf",
		bold: "https://github.com/google/fonts/raw/main/ofl/fredoka/Fredoka-Bold.ttf",
	},
	Roboto: {
		normal:
			"https://github.com/google/fonts/raw/main/ofl/roboto/Roboto-Regular.ttf",
		bold: "https://github.com/google/fonts/raw/main/ofl/roboto/Roboto-Bold.ttf",
	},
	Inter: {
		normal:
			"https://github.com/google/fonts/raw/main/ofl/inter/Inter-Regular.ttf",
		bold: "https://github.com/google/fonts/raw/main/ofl/inter/Inter-Bold.ttf",
	},
};

/** Font preset mappings - maps semantic names to font families */
export const FONT_PRESETS: Record<FontPreset, string> = {
	system: "system", // Uses platform default
	pixel: "PressStart2P",
	retro: "Bangers",
	handwritten: "Fredoka",
	monospace: "RobotoMono", // Will fall back to system monospace if not loaded
};

export function getGoogleFontUrl(
	family: string,
	weight: "normal" | "bold" = "normal",
): string | undefined {
	const font = GOOGLE_FONTS[family];
	if (!font) return undefined;
	return weight === "bold" && font.bold ? font.bold : font.normal;
}

export function getFontFamilyFromPreset(preset: FontPreset): string {
	return FONT_PRESETS[preset] ?? "system";
}
