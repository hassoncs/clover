import type { ShaderLibraryEntry } from "../../shaderRegistry";
import rbShapeBlur from "./rbShapeBlur.glsl";

export const meta: ShaderLibraryEntry = {
	id: "rbShapeBlur",
	glsl: rbShapeBlur,
	paramsSchema: [
		{
			key: "u_shape_size",
			uniformName: "u_shape_size",
			type: "float",
			defaultValue: 1.2,
			ui: { displayName: "Shape Size", min: 0.1, max: 3.0, step: 0.01 },
		},
		{
			key: "u_roundness",
			uniformName: "u_roundness",
			type: "float",
			defaultValue: 0.4,
			ui: { displayName: "Roundness", min: 0.0, max: 1.0, step: 0.01 },
		},
		{
			key: "u_border_size",
			uniformName: "u_border_size",
			type: "float",
			defaultValue: 0.05,
			ui: { displayName: "Border Size", min: 0.0, max: 0.2, step: 0.001 },
		},
		{
			key: "u_circle_size",
			uniformName: "u_circle_size",
			type: "float",
			defaultValue: 0.3,
			ui: { displayName: "Circle Size", min: 0.0, max: 1.0, step: 0.01 },
		},
		{
			key: "u_circle_edge",
			uniformName: "u_circle_edge",
			type: "float",
			defaultValue: 0.5,
			ui: { displayName: "Circle Edge", min: 0.0, max: 1.0, step: 0.01 },
		},
	],
	aiHints: {
		description:
			"React Bits shape blur generator using SDF round-rect border masking with cursor-driven circular softening",
		aliases: [
			"react bits shape blur",
			"shape mask blur",
			"sdf blur",
			"cursor reveal",
			"soft shape frame",
		],
		category: "generator",
		combinability: ["vignette", "bloom", "chromaticAberration", "blur"],
	},
};
