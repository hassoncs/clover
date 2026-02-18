import type { FontPreset } from "@slopcade/shared";
import * as Font from "expo-font";
import { useCallback, useMemo } from "react";
import {
	FONT_PRESETS,
	getFontFamilyFromPreset,
	getGoogleFontUrl,
} from "./FontRegistry";

const loadedFonts = new Set<string>();

export interface FontLoaderResult {
	isLoaded: boolean;
	loadFont: (family: string, url: string) => Promise<void>;
	loadPreset: (preset: FontPreset) => Promise<void>;
	getFontFamily: (familyOrPreset?: string) => string;
}

export function useFontLoader(theme?: {
	fontFamily?: string;
	fontUrl?: string;
	fontPreset?: FontPreset;
}): FontLoaderResult {
	const fontToLoad = useMemo(() => {
		if (theme?.fontUrl) {
			return { family: theme.fontFamily ?? "CustomFont", url: theme.fontUrl };
		}
		if (theme?.fontPreset && theme.fontPreset !== "system") {
			const family = getFontFamilyFromPreset(theme.fontPreset);
			const url = getGoogleFontUrl(family);
			if (url) return { family, url };
		}
		if (theme?.fontFamily) {
			const url = getGoogleFontUrl(theme.fontFamily);
			if (url) return { family: theme.fontFamily, url };
		}
		return null;
	}, [theme?.fontFamily, theme?.fontUrl, theme?.fontPreset]);

	const loadFont = useCallback(async (family: string, url: string) => {
		if (loadedFonts.has(family)) return;

		try {
			await Font.loadAsync({
				[family]: url,
			});
			loadedFonts.add(family);
		} catch (error) {
			console.warn(
				`[FontLoader] Failed to load font "${family}" from ${url}:`,
				error,
			);
		}
	}, []);

	const loadPreset = useCallback(
		async (preset: FontPreset) => {
			if (preset === "system") return;

			const family = getFontFamilyFromPreset(preset);
			const url = getGoogleFontUrl(family);
			if (url) {
				await loadFont(family, url);
			}
		},
		[loadFont],
	);

	const getFontFamily = useCallback((familyOrPreset?: string): string => {
		if (!familyOrPreset) return "system";

		if (familyOrPreset in FONT_PRESETS) {
			const preset = familyOrPreset as FontPreset;
			if (preset === "system") return "system";
			return getFontFamilyFromPreset(preset);
		}

		return familyOrPreset;
	}, []);

	return {
		isLoaded: true,
		loadFont,
		loadPreset,
		getFontFamily,
	};
}

export { loadedFonts };
