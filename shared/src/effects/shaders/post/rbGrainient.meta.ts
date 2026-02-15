import type { ShaderLibraryEntry } from "../../shaderRegistry";
import rbGrainient from "./rbGrainient.glsl";

export const meta: ShaderLibraryEntry = {
	id: "rbGrainient",
	glsl: rbGrainient,
	paramsSchema: [
		{
			key: "u_time_speed",
			uniformName: "u_time_speed",
			type: "float",
			defaultValue: 0.25,
			ui: { displayName: "Time Speed", min: 0.0, max: 3.0, step: 0.01 },
		},
		{
			key: "u_warp_strength",
			uniformName: "u_warp_strength",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Warp Strength", min: 0.0, max: 3.0, step: 0.01 },
		},
		{
			key: "u_warp_frequency",
			uniformName: "u_warp_frequency",
			type: "float",
			defaultValue: 5.0,
			ui: { displayName: "Warp Frequency", min: 0.1, max: 20.0, step: 0.1 },
		},
		{
			key: "u_grain_amount",
			uniformName: "u_grain_amount",
			type: "float",
			defaultValue: 0.1,
			ui: { displayName: "Grain Amount", min: 0.0, max: 1.0, step: 0.01 },
		},
		{
			key: "u_contrast",
			uniformName: "u_contrast",
			type: "float",
			defaultValue: 1.5,
			ui: { displayName: "Contrast", min: 0.1, max: 4.0, step: 0.01 },
		},
		{
			key: "u_saturation",
			uniformName: "u_saturation",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Saturation", min: 0.0, max: 2.0, step: 0.01 },
		},
		{
			key: "u_color1",
			uniformName: "u_color1",
			type: "color",
			defaultValue: [1.0, 0.6235, 0.9882, 1.0],
			ui: { displayName: "Color 1" },
		},
		{
			key: "u_color2",
			uniformName: "u_color2",
			type: "color",
			defaultValue: [0.3216, 0.1529, 1.0, 1.0],
			ui: { displayName: "Color 2" },
		},
		{
			key: "u_color3",
			uniformName: "u_color3",
			type: "color",
			defaultValue: [0.6941, 0.6196, 0.9373, 1.0],
			ui: { displayName: "Color 3" },
		},
	],
	aiHints: {
		description:
			"React Bits grainient generator combining warped three-stop gradients with procedural film grain and contrast shaping",
		aliases: [
			"react bits grainient",
			"grain gradient",
			"warped gradient",
			"textured backdrop",
			"noisy gradient",
		],
		category: "generator",
		combinability: ["vignette", "chromaticAberration", "bloom", "oldFilm"],
	},
};
