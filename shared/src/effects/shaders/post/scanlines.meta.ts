import type { ShaderLibraryEntry } from "../../shaderRegistry";
import scanlines from "./scanlines.glsl";

export const meta: ShaderLibraryEntry = {
	id: "scanlines",
	glsl: scanlines,
	paramsSchema: [
		{
			key: "scanline_count",
			uniformName: "scanline_count",
			type: "float",
			defaultValue: 200.0,
			ui: { displayName: "Scanline Count", min: 50.0, max: 500.0, step: 10.0 },
		},
		{
			key: "scanline_opacity",
			uniformName: "scanline_opacity",
			type: "float",
			defaultValue: 0.3,
			ui: { displayName: "Opacity", min: 0.0, max: 1.0, step: 0.05 },
		},
		{
			key: "scanline_speed",
			uniformName: "scanline_speed",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Scroll Speed", min: 0.0, max: 5.0, step: 0.1 },
		},
		{
			key: "scanline_pattern",
			uniformName: "scanline_pattern",
			type: "int",
			defaultValue: 0,
			ui: {
				displayName: "Pattern",
				min: 0,
				max: 2,
				step: 1,
				options: ["horizontal", "vertical", "grid"],
			},
		},
		{
			key: "brightness",
			uniformName: "brightness",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Brightness", min: 0.5, max: 1.5, step: 0.05 },
		},
		{
			key: "flicker",
			uniformName: "flicker",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Flicker", min: 0.0, max: 0.1, step: 0.01 },
		},
	],
	aiHints: {
		description:
			"Overlays CRT-style scan lines (horizontal, vertical, or grid) with optional scrolling and flicker",
		aliases: [
			"CRT lines",
			"retro lines",
			"TV lines",
			"monitor lines",
			"interlace",
		],
		category: "artistic",
		combinability: [
			"crt",
			"vignette",
			"glitch",
			"chromaticAberration",
			"bloom",
		],
	},
};
