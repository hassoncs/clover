import type { ShaderLibraryEntry } from "../../shaderRegistry";
import nightVision from "./nightVision.glsl";

export const meta: ShaderLibraryEntry = {
	id: "nightVision",
	glsl: nightVision,
	paramsSchema: [
		{
			key: "intensity",
			uniformName: "intensity",
			type: "float",
			defaultValue: 0.5,
			ui: { displayName: "Intensity", min: 0.0, max: 1.0, step: 0.05 },
		},
		{
			key: "noise_strength",
			uniformName: "noise_strength",
			type: "float",
			defaultValue: 0.3,
			ui: { displayName: "Noise Strength", min: 0.0, max: 1.0, step: 0.05 },
		},
		{
			key: "scanline_strength",
			uniformName: "scanline_strength",
			type: "float",
			defaultValue: 0.1,
			ui: { displayName: "Scanline Strength", min: 0.0, max: 1.0, step: 0.05 },
		},
		{
			key: "vignette_size",
			uniformName: "vignette_size",
			type: "float",
			defaultValue: 0.4,
			ui: { displayName: "Vignette Size", min: 0.0, max: 1.0, step: 0.05 },
		},
	],
	aiHints: {
		description:
			"Military-style green phosphor night vision with light amplification, scanlines, grain noise, and vignette",
		aliases: [
			"NVG",
			"green vision",
			"tactical vision",
			"military vision",
			"starlight scope",
		],
		category: "color",
		combinability: ["scanlines", "vignette", "thermalVision", "blur"],
	},
};
