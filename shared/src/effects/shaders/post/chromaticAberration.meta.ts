import type { ShaderLibraryEntry } from "../../shaderRegistry";
import chromaticAberration from "./chromaticAberration.glsl";

export const meta: ShaderLibraryEntry = {
	id: "chromaticAberration",
	glsl: chromaticAberration,
	paramsSchema: [
		{
			key: "strength",
			uniformName: "strength",
			type: "float",
			defaultValue: 3.0,
			ui: { displayName: "Strength", min: 0.0, max: 30.0, step: 0.5 },
		},
		{
			key: "direction",
			uniformName: "direction",
			type: "vec2",
			defaultValue: [1.0, 0.0],
			ui: { displayName: "Direction" },
		},
		{
			key: "radial",
			uniformName: "radial",
			type: "bool",
			defaultValue: false,
			ui: { displayName: "Radial Mode" },
		},
		{
			key: "radial_center",
			uniformName: "radial_center",
			type: "vec2",
			defaultValue: [0.5, 0.5],
			ui: { displayName: "Radial Center" },
		},
		{
			key: "radial_falloff",
			uniformName: "radial_falloff",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Radial Falloff", min: 0.0, max: 2.0, step: 0.1 },
		},
	],
	aiHints: {
		description:
			"Splits RGB channels with an offset to simulate lens chromatic aberration, in directional or radial mode",
		aliases: [
			"RGB split",
			"color fringe",
			"lens aberration",
			"prism effect",
			"color separation",
		],
		category: "distort",
		combinability: ["glitch", "bloom", "vignette", "crt", "motionBlur"],
	},
};
