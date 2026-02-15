import type { ShaderLibraryEntry } from "../../shaderRegistry";
import transform from "./transform.glsl";

export const meta: ShaderLibraryEntry = {
	id: "transform",
	glsl: transform,
	paramsSchema: [
		{
			key: "translate_x",
			uniformName: "translate_x",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Translate X", min: -1.0, max: 1.0, step: 0.01 },
		},
		{
			key: "translate_y",
			uniformName: "translate_y",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Translate Y", min: -1.0, max: 1.0, step: 0.01 },
		},
		{
			key: "scale_x",
			uniformName: "scale_x",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Scale X", min: 0.1, max: 10.0, step: 0.1 },
		},
		{
			key: "scale_y",
			uniformName: "scale_y",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Scale Y", min: 0.1, max: 10.0, step: 0.1 },
		},
		{
			key: "rotation",
			uniformName: "rotation",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Rotation", min: 0.0, max: 360.0, step: 1.0 },
		},
		{
			key: "tile_x",
			uniformName: "tile_x",
			type: "int",
			defaultValue: 1,
			ui: { displayName: "Tile X", min: 1, max: 10, step: 1 },
		},
		{
			key: "tile_y",
			uniformName: "tile_y",
			type: "int",
			defaultValue: 1,
			ui: { displayName: "Tile Y", min: 1, max: 10, step: 1 },
		},
		{
			key: "extend_mode",
			uniformName: "extend_mode",
			type: "int",
			defaultValue: 0,
			ui: {
				displayName: "Extend Mode",
				min: 0,
				max: 2,
				step: 1,
				options: ["clamp", "repeat", "mirror"],
			},
		},
	],
	aiHints: {
		description:
			"Applies UV translation, non-uniform scaling, rotation, and tiling with selectable edge extension behavior",
		aliases: ["translate", "scale", "rotate", "tile", "pan", "zoom", "spin"],
		category: "distort",
		combinability: [
			"displace",
			"ripple",
			"chromaticAberration",
			"lookup",
			"threshold",
		],
	},
};
