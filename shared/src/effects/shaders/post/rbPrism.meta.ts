import type { ShaderLibraryEntry } from "../../shaderRegistry";
import rbPrism from "./rbPrism.glsl";

export const meta: ShaderLibraryEntry = {
	id: "rbPrism",
	glsl: rbPrism,
	paramsSchema: [
		{
			key: "u_height",
			uniformName: "u_height",
			type: "float",
			defaultValue: 3.5,
			ui: { displayName: "Height", min: 0.5, max: 8.0, step: 0.01 },
		},
		{
			key: "u_base_width",
			uniformName: "u_base_width",
			type: "float",
			defaultValue: 5.5,
			ui: { displayName: "Base Width", min: 0.5, max: 10.0, step: 0.01 },
		},
		{
			key: "u_glow",
			uniformName: "u_glow",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Glow", min: 0.0, max: 3.0, step: 0.01 },
		},
		{
			key: "u_noise",
			uniformName: "u_noise",
			type: "float",
			defaultValue: 0.5,
			ui: { displayName: "Noise", min: 0.0, max: 1.0, step: 0.01 },
		},
		{
			key: "u_hue_shift",
			uniformName: "u_hue_shift",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Hue Shift", min: -3.1416, max: 3.1416, step: 0.01 },
		},
		{
			key: "u_color_frequency",
			uniformName: "u_color_frequency",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Color Frequency", min: 0.1, max: 4.0, step: 0.01 },
		},
		{
			key: "u_bloom",
			uniformName: "u_bloom",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Bloom", min: 0.0, max: 3.0, step: 0.01 },
		},
	],
	aiHints: {
		description:
			"React Bits prism generator with raymarched pyramid volume, spectral tinting, and noisy bloom",
		aliases: [
			"react bits prism",
			"neon prism",
			"pyramid glow",
			"volumetric crystal",
			"spectral pyramid",
		],
		category: "generator",
		combinability: ["bloom", "vignette", "chromaticAberration", "colorGrading"],
	},
};
