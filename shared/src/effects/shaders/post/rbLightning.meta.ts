import type { ShaderLibraryEntry } from "../../shaderRegistry";
import rbLightning from "./rbLightning.glsl";

export const meta: ShaderLibraryEntry = {
	id: "rbLightning",
	glsl: rbLightning,
	paramsSchema: [
		{
			key: "u_hue",
			uniformName: "u_hue",
			type: "float",
			defaultValue: 230.0,
			ui: { displayName: "Hue", min: 0.0, max: 360.0, step: 1.0 },
		},
		{
			key: "u_x_offset",
			uniformName: "u_x_offset",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "X Offset", min: -2.0, max: 2.0, step: 0.01 },
		},
		{
			key: "u_speed",
			uniformName: "u_speed",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Speed", min: 0.0, max: 5.0, step: 0.05 },
		},
		{
			key: "u_intensity",
			uniformName: "u_intensity",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Intensity", min: 0.0, max: 5.0, step: 0.05 },
		},
		{
			key: "u_size",
			uniformName: "u_size",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Size", min: 0.1, max: 5.0, step: 0.05 },
		},
	],
	aiHints: {
		description:
			"Procedural lightning-column generator using fractal noise displacement and HSV-tinted electric glow",
		aliases: [
			"react bits lightning",
			"electric beam",
			"plasma bolt",
			"energy column",
			"storm streak",
		],
		category: "generator",
		combinability: ["bloom", "vignette", "chromaticAberration", "motionBlur"],
	},
};
