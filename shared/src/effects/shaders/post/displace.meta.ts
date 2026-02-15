import type { ShaderLibraryEntry } from "../../shaderRegistry";
import displace from "./displace.glsl";

export const meta: ShaderLibraryEntry = {
	id: "displace",
	glsl: displace,
	paramsSchema: [
		{
			key: "strength",
			uniformName: "strength",
			type: "float",
			defaultValue: 10.0,
			ui: { displayName: "Strength", min: 0.0, max: 100.0, step: 1.0 },
		},
		{
			key: "noise_scale",
			uniformName: "noise_scale",
			type: "float",
			defaultValue: 10.0,
			ui: { displayName: "Noise Scale", min: 1.0, max: 50.0, step: 0.5 },
		},
		{
			key: "noise_speed",
			uniformName: "noise_speed",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Noise Speed", min: 0.0, max: 5.0, step: 0.05 },
		},
		{
			key: "direction",
			uniformName: "direction",
			type: "int",
			defaultValue: 0,
			ui: {
				displayName: "Direction",
				min: 0,
				max: 2,
				step: 1,
				options: ["both", "horizontal", "vertical"],
			},
		},
	],
	aiHints: {
		description:
			"Warps screen UVs using animated procedural noise gradients for fluid displacement and heat-haze style motion",
		aliases: ["warp", "distort", "displacement", "liquid", "heat haze"],
		category: "distort",
		combinability: [
			"transform",
			"chromaticAberration",
			"blur",
			"glitch",
			"bloom",
		],
	},
};
