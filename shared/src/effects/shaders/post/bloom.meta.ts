import type { ShaderLibraryEntry } from "../../shaderRegistry";
import bloom from "./bloom.glsl";

export const meta: ShaderLibraryEntry = {
	id: "bloom",
	glsl: bloom,
	paramsSchema: [
		{
			key: "threshold",
			uniformName: "threshold",
			type: "float",
			defaultValue: 0.8,
			ui: { displayName: "Threshold", min: 0.0, max: 1.0, step: 0.05 },
		},
		{
			key: "intensity",
			uniformName: "intensity",
			type: "float",
			defaultValue: 1.5,
			ui: { displayName: "Intensity", min: 0.0, max: 5.0, step: 0.1 },
		},
		{
			key: "radius",
			uniformName: "radius",
			type: "float",
			defaultValue: 3.0,
			ui: { displayName: "Radius", min: 0.0, max: 10.0, step: 0.5 },
		},
	],
	aiHints: {
		description:
			"Bright-area glow that extracts pixels above a luminance threshold and blurs them back additively",
		aliases: [
			"glow bloom",
			"light bloom",
			"bright glow",
			"HDR glow",
			"light bleed",
		],
		category: "glow",
		combinability: [
			"vignette",
			"blur",
			"colorGrading",
			"chromaticAberration",
			"crt",
		],
	},
};
