import type { ShaderLibraryEntry } from '../../shaderRegistry';
import innerGlow from "./innerGlow.glsl";

export const meta: ShaderLibraryEntry = {
	id: "innerGlow",
	glsl: innerGlow,
	paramsSchema: [
		{
			key: "glow_color",
			uniformName: "glow_color",
			type: "color",
			defaultValue: [1.0, 0.5, 0.0, 1.0],
			ui: { displayName: "Glow Color" },
		},
		{
			key: "glow_width",
			uniformName: "glow_width",
			type: "float",
			defaultValue: 5.0,
			ui: { displayName: "Glow Width", min: 0.0, max: 20.0, step: 0.5 },
		},
		{
			key: "glow_intensity",
			uniformName: "glow_intensity",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Glow Intensity", min: 0.0, max: 3.0, step: 0.1 },
		},
		{
			key: "glow_falloff",
			uniformName: "glow_falloff",
			type: "float",
			defaultValue: 2.0,
			ui: { displayName: "Glow Falloff", min: 0.5, max: 5.0, step: 0.1 },
		},
		{
			key: "additive",
			uniformName: "additive",
			type: "bool",
			defaultValue: true,
			ui: { displayName: "Additive Blend" },
		},
	],
	aiHints: {
		description:
			"Emits a glow inward from the sprite edges, giving an inner-fire or energy effect",
		aliases: [
			"inner fire",
			"edge glow inward",
			"internal glow",
			"inner radiance",
		],
		category: "glow",
		combinability: ["rimLight", "glow", "tint", "outline"],
	},
};
