import type { ShaderLibraryEntry } from '../../shaderRegistry';
import waveDistortion from "./waveDistortion.glsl";

export const meta: ShaderLibraryEntry = {
	id: "waveDistortion",
	glsl: waveDistortion,
	paramsSchema: [
		{
			key: "amplitude_x",
			uniformName: "amplitude_x",
			type: "float",
			defaultValue: 0.02,
			ui: { displayName: "Amplitude X", min: 0.0, max: 0.2, step: 0.005 },
		},
		{
			key: "amplitude_y",
			uniformName: "amplitude_y",
			type: "float",
			defaultValue: 0.02,
			ui: { displayName: "Amplitude Y", min: 0.0, max: 0.2, step: 0.005 },
		},
		{
			key: "frequency_x",
			uniformName: "frequency_x",
			type: "float",
			defaultValue: 10.0,
			ui: { displayName: "Frequency X", min: 0.0, max: 50.0, step: 1.0 },
		},
		{
			key: "frequency_y",
			uniformName: "frequency_y",
			type: "float",
			defaultValue: 10.0,
			ui: { displayName: "Frequency Y", min: 0.0, max: 50.0, step: 1.0 },
		},
		{
			key: "speed",
			uniformName: "speed",
			type: "float",
			defaultValue: 2.0,
			ui: { displayName: "Speed", min: 0.0, max: 10.0, step: 0.5 },
		},
	],
	aiHints: {
		description:
			"Sine wave UV distortion that warps the sprite with animated ripples",
		aliases: ["wave", "wobble", "wiggle", "wavy", "undulate"],
		category: "distort",
		combinability: ["tint", "glow", "outline", "dissolve"],
	},
};
