import type { ShaderLibraryEntry } from "../../shaderRegistry";
import ramp from "./ramp.glsl";

export const meta: ShaderLibraryEntry = {
	id: "ramp",
	glsl: ramp,
	paramsSchema: [
		{
			key: "color_a",
			uniformName: "color_a",
			type: "color",
			defaultValue: [1.0, 1.0, 1.0, 1.0],
			ui: { displayName: "Color A" },
		},
		{
			key: "color_b",
			uniformName: "color_b",
			type: "color",
			defaultValue: [0.0, 0.0, 0.0, 1.0],
			ui: { displayName: "Color B" },
		},
		{
			key: "ramp_type",
			uniformName: "ramp_type",
			type: "int",
			defaultValue: 0,
			ui: {
				displayName: "Ramp Type",
				min: 0,
				max: 3,
				step: 1,
				options: ["linear horizontal", "linear vertical", "radial", "circular"],
			},
		},
		{
			key: "offset",
			uniformName: "offset",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Offset", min: 0.0, max: 1.0, step: 0.01 },
		},
		{
			key: "smoothness",
			uniformName: "smoothness",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Smoothness", min: 0.0, max: 1.0, step: 0.01 },
		},
	],
	aiHints: {
		description:
			"Procedural gradient generator with horizontal, vertical, radial, and circular ramps plus offset and smoothness control",
		aliases: ["gradient", "ramp", "color ramp"],
		category: "generator",
		combinability: ["level", "colorGrading", "vignette", "blur", "bloom"],
	},
};
