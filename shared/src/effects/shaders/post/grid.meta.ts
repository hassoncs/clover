import type { ShaderLibraryEntry } from '../../shaderRegistry';
import grid from "./grid.glsl";

export const meta: ShaderLibraryEntry = {
	id: "grid",
	glsl: grid,
	paramsSchema: [
		{
			key: "grid_size",
			uniformName: "grid_size",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Grid Size", min: 0.1, max: 10.0, step: 0.1 },
		},
		{
			key: "line_width",
			uniformName: "line_width",
			type: "float",
			defaultValue: 0.02,
			ui: { displayName: "Line Width", min: 0.001, max: 0.1, step: 0.005 },
		},
		{
			key: "color",
			uniformName: "color",
			type: "color",
			defaultValue: [0.5, 0.5, 0.5, 0.5],
			ui: { displayName: "Grid Color" },
		},
		{
			key: "fade_start",
			uniformName: "fade_start",
			type: "float",
			defaultValue: 20.0,
			ui: { displayName: "Fade Start", min: 5.0, max: 100.0, step: 5.0 },
		},
		{
			key: "fade_end",
			uniformName: "fade_end",
			type: "float",
			defaultValue: 40.0,
			ui: { displayName: "Fade End", min: 10.0, max: 200.0, step: 5.0 },
		},
	],
	aiHints: {
		description:
			"3D spatial grid overlay with major/minor lines, axis coloring, and distance-based fade (spatial shader)",
		aliases: [
			"world grid",
			"floor grid",
			"editor grid",
			"debug grid",
			"wireframe grid",
		],
		category: "utility",
		combinability: [],
	},
};
