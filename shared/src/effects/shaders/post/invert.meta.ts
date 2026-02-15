import type { ShaderLibraryEntry } from "../../shaderRegistry";
import invert from "./invert.glsl";

export const meta: ShaderLibraryEntry = {
	id: "invert",
	glsl: invert,
	paramsSchema: [
		{
			key: "strength",
			uniformName: "strength",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Strength", min: 0.0, max: 1.0, step: 0.01 },
		},
		{
			key: "invert_r",
			uniformName: "invert_r",
			type: "bool",
			defaultValue: true,
			ui: { displayName: "Invert Red" },
		},
		{
			key: "invert_g",
			uniformName: "invert_g",
			type: "bool",
			defaultValue: true,
			ui: { displayName: "Invert Green" },
		},
		{
			key: "invert_b",
			uniformName: "invert_b",
			type: "bool",
			defaultValue: true,
			ui: { displayName: "Invert Blue" },
		},
		{
			key: "invert_a",
			uniformName: "invert_a",
			type: "bool",
			defaultValue: false,
			ui: { displayName: "Invert Alpha" },
		},
	],
	aiHints: {
		description:
			"Inverts selected color channels and blends between original and inverted output with strength control",
		aliases: ["negate", "negative", "invert colors", "reverse"],
		category: "color",
		combinability: ["colorGrading", "vignette", "edge", "glitch"],
	},
};
