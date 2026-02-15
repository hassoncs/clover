import type { ShaderLibraryEntry } from '../../shaderRegistry';
import tint from "./tint.glsl";

export const meta: ShaderLibraryEntry = {
	id: "tint",
	glsl: tint,
	paramsSchema: [
		{
			key: "tint_color",
			uniformName: "tint_color",
			type: "color",
			defaultValue: [1.0, 1.0, 1.0, 1.0],
			ui: { displayName: "Tint Color" },
		},
		{
			key: "tint_amount",
			uniformName: "tint_amount",
			type: "float",
			defaultValue: 0.5,
			ui: { displayName: "Tint Amount", min: 0.0, max: 1.0, step: 0.05 },
		},
		{
			key: "blend_mode",
			uniformName: "blend_mode",
			type: "int",
			defaultValue: 0,
			ui: {
				displayName: "Blend Mode",
				min: 0,
				max: 4,
				step: 1,
				options: ["multiply", "add", "screen", "overlay", "replace"],
			},
		},
	],
	aiHints: {
		description:
			"Applies a color tint to the sprite with multiple blend modes (multiply, add, screen, overlay, replace)",
		aliases: ["color shift", "hue shift", "recolor", "color overlay"],
		category: "color",
		combinability: ["glow", "outline", "dissolve", "silhouette"],
	},
};
