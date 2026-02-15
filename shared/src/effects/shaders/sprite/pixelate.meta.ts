import type { ShaderLibraryEntry } from '../../shaderRegistry';
import pixelate from "./pixelate.glsl";

export const meta: ShaderLibraryEntry = {
	id: "pixelate",
	glsl: pixelate,
	paramsSchema: [
		{
			key: "pixel_size",
			uniformName: "pixel_size",
			type: "float",
			defaultValue: 8.0,
			ui: { displayName: "Pixel Size", min: 2.0, max: 64.0, step: 1.0 },
		},
	],
	aiHints: {
		description: "Reduces the sprite resolution into chunky retro-style pixels",
		aliases: ["retro", "low-res", "mosaic", "8-bit", "blockify"],
		category: "artistic",
		combinability: ["posterize", "outline", "tint", "scanlines"],
	},
};
