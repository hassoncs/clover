import type { ShaderLibraryEntry } from "../../shaderRegistry";
import lookup from "./lookup.glsl";

export const meta: ShaderLibraryEntry = {
	id: "lookup",
	glsl: lookup,
	paramsSchema: [
		{
			key: "color_low",
			uniformName: "color_low",
			type: "color",
			defaultValue: [0.0, 0.0, 0.0, 1.0],
			ui: { displayName: "Low Color" },
		},
		{
			key: "color_mid",
			uniformName: "color_mid",
			type: "color",
			defaultValue: [0.5, 0.5, 0.5, 1.0],
			ui: { displayName: "Mid Color" },
		},
		{
			key: "color_high",
			uniformName: "color_high",
			type: "color",
			defaultValue: [1.0, 1.0, 1.0, 1.0],
			ui: { displayName: "High Color" },
		},
		{
			key: "midpoint",
			uniformName: "midpoint",
			type: "float",
			defaultValue: 0.5,
			ui: { displayName: "Midpoint", min: 0.0, max: 1.0, step: 0.01 },
		},
		{
			key: "intensity",
			uniformName: "intensity",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Intensity", min: 0.0, max: 1.0, step: 0.01 },
		},
	],
	aiHints: {
		description:
			"Remaps luminance through a three-point gradient for false-color grading and artistic LUT-like looks",
		aliases: [
			"gradient map",
			"color map",
			"LUT",
			"false color",
			"thermal map",
			"lookup table",
		],
		category: "color",
		combinability: [
			"colorGrading",
			"vignette",
			"threshold",
			"halftone",
			"scanlines",
		],
	},
};
