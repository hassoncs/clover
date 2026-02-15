import type { ShaderLibraryEntry } from '../../shaderRegistry';
import rimLight from "./rimLight.glsl";

export const meta: ShaderLibraryEntry = {
	id: "rimLight",
	glsl: rimLight,
	paramsSchema: [
		{
			key: "rim_color",
			uniformName: "rim_color",
			type: "color",
			defaultValue: [1.0, 1.0, 1.0, 1.0],
			ui: { displayName: "Rim Color" },
		},
		{
			key: "rim_width",
			uniformName: "rim_width",
			type: "float",
			defaultValue: 3.0,
			ui: { displayName: "Rim Width", min: 0.0, max: 20.0, step: 0.5 },
		},
		{
			key: "rim_intensity",
			uniformName: "rim_intensity",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Rim Intensity", min: 0.0, max: 3.0, step: 0.1 },
		},
		{
			key: "light_direction",
			uniformName: "light_direction",
			type: "vec2",
			defaultValue: [1.0, -1.0],
			ui: { displayName: "Light Direction" },
		},
		{
			key: "additive_blend",
			uniformName: "additive_blend",
			type: "bool",
			defaultValue: true,
			ui: { displayName: "Additive Blend" },
		},
		{
			key: "inner_fade",
			uniformName: "inner_fade",
			type: "float",
			defaultValue: 0.5,
			ui: { displayName: "Inner Fade", min: 0.0, max: 1.0, step: 0.1 },
		},
	],
	aiHints: {
		description:
			"Directional edge lighting that simulates a light source hitting the rim of the sprite",
		aliases: ["edge light", "back light", "contour light", "rim glow"],
		category: "glow",
		combinability: ["tint", "glow", "innerGlow", "outline"],
	},
};
