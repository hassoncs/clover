import type { ShaderLibraryEntry } from "../../shaderRegistry";
import colorGrading from "./colorGrading.glsl";

export const meta: ShaderLibraryEntry = {
	id: "colorGrading",
	glsl: colorGrading,
	paramsSchema: [
		{
			key: "brightness",
			uniformName: "brightness",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Brightness", min: -1.0, max: 1.0, step: 0.05 },
		},
		{
			key: "contrast",
			uniformName: "contrast",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Contrast", min: 0.0, max: 2.0, step: 0.05 },
		},
		{
			key: "saturation",
			uniformName: "saturation",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Saturation", min: 0.0, max: 2.0, step: 0.05 },
		},
		{
			key: "gamma",
			uniformName: "gamma",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Gamma", min: 0.5, max: 2.0, step: 0.05 },
		},
		{
			key: "temperature",
			uniformName: "temperature",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Temperature", min: -1.0, max: 1.0, step: 0.05 },
		},
		{
			key: "tint_color",
			uniformName: "tint_color",
			type: "color",
			defaultValue: [1.0, 1.0, 1.0, 1.0],
			ui: { displayName: "Tint Color" },
		},
		{
			key: "tint_strength",
			uniformName: "tint_strength",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Tint Strength", min: 0.0, max: 1.0, step: 0.05 },
		},
		{
			key: "shadow_color",
			uniformName: "shadow_color",
			type: "color",
			defaultValue: [0.0, 0.0, 0.0, 1.0],
			ui: { displayName: "Shadow Color" },
		},
		{
			key: "highlight_color",
			uniformName: "highlight_color",
			type: "color",
			defaultValue: [1.0, 1.0, 1.0, 1.0],
			ui: { displayName: "Highlight Color" },
		},
		{
			key: "shadow_strength",
			uniformName: "shadow_strength",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Shadow Strength", min: 0.0, max: 1.0, step: 0.05 },
		},
		{
			key: "highlight_strength",
			uniformName: "highlight_strength",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Highlight Strength", min: 0.0, max: 1.0, step: 0.05 },
		},
		{
			key: "preset",
			uniformName: "preset",
			type: "int",
			defaultValue: 0,
			ui: {
				displayName: "Preset",
				min: 0,
				max: 5,
				step: 1,
				options: [
					"custom",
					"warm vintage",
					"cool cinema",
					"high contrast",
					"sepia",
					"noir",
				],
			},
		},
	],
	aiHints: {
		description:
			"Full color grading suite: brightness, contrast, saturation, gamma, temperature, tint, shadow/highlight coloring, and presets",
		aliases: ["color correction", "LUT", "color grade", "tone mapping", "look"],
		category: "color",
		combinability: ["vignette", "bloom", "blur", "oldFilm", "nightVision"],
	},
};
