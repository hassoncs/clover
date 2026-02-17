export const STYLE_NAMES = [
	"Holographic",
	"Glitch Digital",
	"Liquid Chrome",
	"VHS Retro",
	"Fire Plasma",
	"Electric Neon",
] as const;

export type SplashStyleName = (typeof STYLE_NAMES)[number];

export interface SplashPreviewCanvasProps {
	styleName: SplashStyleName;
	time?: number;
	width?: number;
	height?: number;
}
