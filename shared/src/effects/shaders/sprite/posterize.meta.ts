import type { ShaderLibraryEntry } from '../../shaderRegistry';
import posterize from "./posterize.glsl";

export const meta: ShaderLibraryEntry = {
	id: "posterize",
	glsl: posterize,
	paramsSchema: [
		{
			key: "color_levels",
			uniformName: "color_levels",
			type: "float",
			defaultValue: 4.0,
			ui: { displayName: "Color Levels", min: 2.0, max: 32.0, step: 1.0 },
		},
	],
	aiHints: {
		description:
			"Reduces the number of distinct color levels for a flat poster-art look",
		aliases: ["color quantize", "flat color", "poster art", "band colors"],
		category: "color",
		combinability: ["pixelate", "outline", "tint", "halftone"],
	},
};
