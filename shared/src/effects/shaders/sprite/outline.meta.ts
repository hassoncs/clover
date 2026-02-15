import type { ShaderLibraryEntry } from '../../shaderRegistry';
import outline from "./outline.glsl";

export const meta: ShaderLibraryEntry = {
	id: "outline",
	glsl: outline,
	paramsSchema: [
		{
			key: "outline_color",
			uniformName: "outline_color",
			type: "color",
			defaultValue: [1.0, 1.0, 0.0, 1.0],
			ui: { displayName: "Outline Color" },
		},
		{
			key: "outline_width",
			uniformName: "outline_width",
			type: "float",
			defaultValue: 2.0,
			ui: { displayName: "Outline Width", min: 0.0, max: 10.0, step: 0.5 },
		},
		{
			key: "outline_only",
			uniformName: "outline_only",
			type: "bool",
			defaultValue: false,
			ui: { displayName: "Outline Only" },
		},
	],
	aiHints: {
		description:
			"Draws a colored border around the sprite by detecting inner edges via alpha sampling",
		aliases: ["border", "stroke", "edge", "highlight border"],
		category: "artistic",
		combinability: ["glow", "tint", "silhouette", "dropShadow"],
	},
};
