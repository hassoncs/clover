import { createContext, useContext } from "react";
import type { SkTypefaceFontProvider } from "@shopify/react-native-skia";

export const FontContext = createContext<SkTypefaceFontProvider | null>(null);

export function usePenFontMgr(): SkTypefaceFontProvider | null {
	return useContext(FontContext);
}
