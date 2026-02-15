import type { ShaderLibraryEntry } from "../../shaderRegistry";
import crt from "./crt.glsl";

export const meta: ShaderLibraryEntry = {
	id: "crt",
	glsl: crt,
	paramsSchema: [
		{
			key: "scanline_opacity",
			uniformName: "scanline_opacity",
			type: "float",
			defaultValue: 0.4,
			ui: { displayName: "Scanline Opacity", min: 0.0, max: 1.0, step: 0.05 },
		},
		{
			key: "scanline_width",
			uniformName: "scanline_width",
			type: "float",
			defaultValue: 0.25,
			ui: { displayName: "Scanline Width", min: 0.0, max: 1.0, step: 0.05 },
		},
		{
			key: "curvature",
			uniformName: "curvature",
			type: "float",
			defaultValue: 0.1,
			ui: { displayName: "Curvature", min: 0.0, max: 0.5, step: 0.01 },
		},
		{
			key: "rgb_offset",
			uniformName: "rgb_offset",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "RGB Offset", min: 0.0, max: 5.0, step: 0.1 },
		},
		{
			key: "vignette_strength",
			uniformName: "vignette_strength",
			type: "float",
			defaultValue: 0.3,
			ui: { displayName: "Vignette Strength", min: 0.0, max: 1.0, step: 0.05 },
		},
		{
			key: "brightness",
			uniformName: "brightness",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Brightness", min: 0.5, max: 1.5, step: 0.05 },
		},
		{
			key: "contrast",
			uniformName: "contrast",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Contrast", min: 0.5, max: 1.5, step: 0.05 },
		},
		{
			key: "flicker",
			uniformName: "flicker",
			type: "float",
			defaultValue: 0.02,
			ui: { displayName: "Flicker", min: 0.0, max: 0.1, step: 0.005 },
		},
	],
	aiHints: {
		description:
			"Full CRT monitor simulation with barrel curvature, RGB shadow mask, scanlines, vignette, and flicker",
		aliases: [
			"CRT monitor",
			"retro TV",
			"old screen",
			"tube monitor",
			"arcade screen",
		],
		category: "artistic",
		combinability: ["scanlines", "glitch", "pixelateScreen", "bloom"],
	},
};
