import type { ShaderLibraryEntry } from "../../shaderRegistry";
import math from "./math.glsl";

export const meta: ShaderLibraryEntry = {
	id: "math",
	glsl: math,
	paramsSchema: [
		{
			key: "operation",
			uniformName: "operation",
			type: "int",
			defaultValue: 0,
			ui: {
				displayName: "Operation",
				min: 0,
				max: 8,
				step: 1,
				options: [
					"add",
					"multiply",
					"power",
					"abs",
					"invert",
					"step",
					"smoothstep",
					"sin",
					"clamp",
				],
			},
		},
		{
			key: "value",
			uniformName: "value",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Value", min: -2.0, max: 2.0, step: 0.01 },
		},
		{
			key: "range_min",
			uniformName: "range_min",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Range Min", min: 0.0, max: 1.0, step: 0.01 },
		},
		{
			key: "range_max",
			uniformName: "range_max",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Range Max", min: 0.0, max: 1.0, step: 0.01 },
		},
		{
			key: "affect_alpha",
			uniformName: "affect_alpha",
			type: "bool",
			defaultValue: false,
			ui: { displayName: "Affect Alpha" },
		},
	],
	aiHints: {
		description:
			"Performs configurable per-pixel math operations for utility adjustment, remapping, and procedural signal shaping",
		aliases: ["math", "add", "multiply", "power", "invert", "clamp", "step"],
		category: "utility",
		combinability: [
			"lookup",
			"threshold",
			"colorGrading",
			"halftone",
			"pixelateScreen",
		],
	},
};
