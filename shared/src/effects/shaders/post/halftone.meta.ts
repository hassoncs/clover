import type { ShaderLibraryEntry } from "../../shaderRegistry";
import halftone from "./halftone.glsl";

export const meta: ShaderLibraryEntry = {
	id: "halftone",
	glsl: halftone,
	paramsSchema: [
		{
			key: "dot_size",
			uniformName: "dot_size",
			type: "float",
			defaultValue: 8.0,
			ui: { displayName: "Dot Size", min: 1.0, max: 50.0, step: 1.0 },
		},
		{
			key: "contrast",
			uniformName: "contrast",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Contrast", min: 1.0, max: 5.0, step: 0.1 },
		},
		{
			key: "intensity",
			uniformName: "intensity",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Intensity", min: 0.0, max: 1.0, step: 0.05 },
		},
	],
	aiHints: {
		description:
			"CMYK halftone dot pattern that simulates newspaper or comic book printing with rotated dot screens",
		aliases: [
			"newspaper print",
			"comic dots",
			"ben-day dots",
			"print dots",
			"dot screen",
		],
		category: "artistic",
		combinability: ["posterize", "oldFilm", "vignette", "colorGrading"],
	},
};
