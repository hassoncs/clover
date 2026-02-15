import type { ShaderLibraryEntry } from "../../shaderRegistry";
import shimmer from "./shimmer.glsl";

export const meta: ShaderLibraryEntry = {
	id: "shimmer",
	glsl: shimmer,
	paramsSchema: [
		{
			key: "amplitude",
			uniformName: "amplitude",
			type: "float",
			defaultValue: 0.005,
			ui: { displayName: "Amplitude", min: 0.0, max: 0.03, step: 0.001 },
		},
		{
			key: "frequency_x",
			uniformName: "frequency_x",
			type: "float",
			defaultValue: 30.0,
			ui: { displayName: "Frequency X", min: 0.0, max: 100.0, step: 5.0 },
		},
		{
			key: "frequency_y",
			uniformName: "frequency_y",
			type: "float",
			defaultValue: 20.0,
			ui: { displayName: "Frequency Y", min: 0.0, max: 100.0, step: 5.0 },
		},
		{
			key: "speed",
			uniformName: "speed",
			type: "float",
			defaultValue: 2.0,
			ui: { displayName: "Speed", min: 0.0, max: 10.0, step: 0.5 },
		},
		{
			key: "vertical_only",
			uniformName: "vertical_only",
			type: "bool",
			defaultValue: false,
			ui: { displayName: "Vertical Only" },
		},
		{
			key: "heat_rise",
			uniformName: "heat_rise",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Heat Rise", min: 0.0, max: 0.01, step: 0.001 },
		},
	],
	aiHints: {
		description:
			"Subtle screen-space UV distortion creating a heat shimmer or mirage effect",
		aliases: [
			"heat haze",
			"mirage",
			"heat distortion",
			"air shimmer",
			"heat wave",
		],
		category: "distort",
		combinability: ["blur", "underwater", "vignette", "colorGrading"],
	},
};
