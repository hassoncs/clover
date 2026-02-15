import type { ShaderLibraryEntry } from "../../shaderRegistry";
import oldFilm from "./oldFilm.glsl";

export const meta: ShaderLibraryEntry = {
	id: "oldFilm",
	glsl: oldFilm,
	paramsSchema: [
		{
			key: "sepia_strength",
			uniformName: "sepia_strength",
			type: "float",
			defaultValue: 0.8,
			ui: { displayName: "Sepia Strength", min: 0.0, max: 1.0, step: 0.05 },
		},
		{
			key: "scratch_strength",
			uniformName: "scratch_strength",
			type: "float",
			defaultValue: 0.3,
			ui: { displayName: "Scratch Strength", min: 0.0, max: 1.0, step: 0.05 },
		},
		{
			key: "noise_strength",
			uniformName: "noise_strength",
			type: "float",
			defaultValue: 0.2,
			ui: { displayName: "Noise Strength", min: 0.0, max: 1.0, step: 0.05 },
		},
		{
			key: "vignette_size",
			uniformName: "vignette_size",
			type: "float",
			defaultValue: 0.4,
			ui: { displayName: "Vignette Size", min: 0.0, max: 1.0, step: 0.05 },
		},
	],
	aiHints: {
		description:
			"Vintage movie filter with sepia tone, film grain, vertical scratches, flicker, and vignette",
		aliases: [
			"vintage film",
			"retro movie",
			"film grain",
			"old movie",
			"classic film",
		],
		category: "artistic",
		combinability: ["vignette", "scanlines", "blur", "colorGrading"],
	},
};
