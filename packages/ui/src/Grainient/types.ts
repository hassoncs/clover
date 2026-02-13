import type { ViewProps } from "react-native";

export interface GrainOverlayProps extends ViewProps {
	/**
	 * Opacity of the grain effect.
	 * @default 0.1 (from theme tokens)
	 */
	opacity?: number;

	/**
	 * Blend mode for the grain effect.
	 * @default 'overlay' (from theme tokens)
	 */
	blendMode?:
		| "overlay"
		| "multiply"
		| "soft-light"
		| "screen"
		| "darken"
		| "lighten"
		| "color-dodge"
		| "color-burn"
		| "hard-light"
		| "difference"
		| "exclusion"
		| "hue"
		| "saturation"
		| "color"
		| "luminosity";
}

export interface GradientFillProps extends ViewProps {
	/**
	 * Array of hex colors to use for the gradient fill.
	 * Typically 3-4 colors from the theme palettes.
	 */
	colors: string[] | readonly string[];

	/**
	 * Optional blur radius for web (in pixels).
	 * Defaults to 64px for a soft blob effect.
	 */
	blurRadius?: number;
}
