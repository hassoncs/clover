import type { ShaderLibraryEntry } from "../../shaderRegistry";
import rbGalaxy from "./rbGalaxy.glsl";

export const meta: ShaderLibraryEntry = {
	id: "rbGalaxy",
	glsl: rbGalaxy,
	paramsSchema: [
		{
			key: "u_density",
			uniformName: "u_density",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Density", min: 0.1, max: 4.0, step: 0.05 },
		},
		{
			key: "u_hue_shift",
			uniformName: "u_hue_shift",
			type: "float",
			defaultValue: 140.0,
			ui: { displayName: "Hue Shift", min: 0.0, max: 360.0, step: 1.0 },
		},
		{
			key: "u_glow_intensity",
			uniformName: "u_glow_intensity",
			type: "float",
			defaultValue: 0.3,
			ui: { displayName: "Glow Intensity", min: 0.0, max: 2.0, step: 0.01 },
		},
		{
			key: "u_twinkle_intensity",
			uniformName: "u_twinkle_intensity",
			type: "float",
			defaultValue: 0.3,
			ui: { displayName: "Twinkle Intensity", min: 0.0, max: 2.0, step: 0.01 },
		},
		{
			key: "u_rotation_speed",
			uniformName: "u_rotation_speed",
			type: "float",
			defaultValue: 0.1,
			ui: { displayName: "Rotation Speed", min: -2.0, max: 2.0, step: 0.01 },
		},
	],
	aiHints: {
		description:
			"React Bits galaxy generator with layered procedural stars, hue shifting, twinkle modulation, and slow orbital drift",
		aliases: [
			"react bits galaxy",
			"star field",
			"space background",
			"cosmic sky",
			"twinkling stars",
		],
		category: "generator",
		combinability: ["vignette", "chromaticAberration", "bloom", "colorGrading"],
	},
};
