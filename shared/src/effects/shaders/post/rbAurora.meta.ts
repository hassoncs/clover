import type { ShaderLibraryEntry } from "../../shaderRegistry";
import rbAurora from "./rbAurora.glsl";

export const meta: ShaderLibraryEntry = {
	id: "rbAurora",
	glsl: rbAurora,
	paramsSchema: [
		{
			key: "u_amplitude",
			uniformName: "u_amplitude",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Amplitude", min: 0.0, max: 3.0, step: 0.05 },
		},
		{
			key: "u_blend",
			uniformName: "u_blend",
			type: "float",
			defaultValue: 0.5,
			ui: { displayName: "Blend", min: 0.0, max: 1.0, step: 0.01 },
		},
		{
			key: "u_color_stop_a",
			uniformName: "u_color_stop_a",
			type: "color",
			defaultValue: [0.3216, 0.1529, 1.0, 1.0],
			ui: { displayName: "Color Stop A" },
		},
		{
			key: "u_color_stop_b",
			uniformName: "u_color_stop_b",
			type: "color",
			defaultValue: [0.4863, 1.0, 0.4039, 1.0],
			ui: { displayName: "Color Stop B" },
		},
		{
			key: "u_color_stop_c",
			uniformName: "u_color_stop_c",
			type: "color",
			defaultValue: [0.3216, 0.1529, 1.0, 1.0],
			ui: { displayName: "Color Stop C" },
		},
	],
	aiHints: {
		description:
			"Animated aurora band generator using simplex noise and a three-stop horizontal color ramp",
		aliases: [
			"react bits aurora",
			"northern lights",
			"aurora borealis",
			"neon sky",
			"plasma curtain",
		],
		category: "generator",
		combinability: ["vignette", "bloom", "colorGrading", "blur"],
	},
};
