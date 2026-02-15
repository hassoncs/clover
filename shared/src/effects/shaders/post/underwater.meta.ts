import type { ShaderLibraryEntry } from "../../shaderRegistry";
import underwater from "./underwater.glsl";

export const meta: ShaderLibraryEntry = {
	id: "underwater",
	glsl: underwater,
	paramsSchema: [
		{
			key: "intensity",
			uniformName: "intensity",
			type: "float",
			defaultValue: 0.5,
			ui: { displayName: "Intensity", min: 0.0, max: 1.0, step: 0.05 },
		},
		{
			key: "wave_speed",
			uniformName: "wave_speed",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Wave Speed", min: 0.1, max: 5.0, step: 0.1 },
		},
		{
			key: "wave_frequency",
			uniformName: "wave_frequency",
			type: "float",
			defaultValue: 10.0,
			ui: { displayName: "Wave Frequency", min: 1.0, max: 20.0, step: 1.0 },
		},
		{
			key: "wave_amplitude",
			uniformName: "wave_amplitude",
			type: "float",
			defaultValue: 0.01,
			ui: { displayName: "Wave Amplitude", min: 0.001, max: 0.05, step: 0.001 },
		},
		{
			key: "water_tint",
			uniformName: "water_tint",
			type: "color",
			defaultValue: [0.0, 0.4, 0.8, 0.3],
			ui: { displayName: "Water Tint" },
		},
	],
	aiHints: {
		description:
			"Simulates being underwater with wavy UV distortion, blue tint, and animated caustic light patterns",
		aliases: ["water", "ocean", "submerged", "aquatic", "sea"],
		category: "distort",
		combinability: ["blur", "vignette", "colorGrading", "bloom"],
	},
};
