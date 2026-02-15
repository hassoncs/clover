import type { ShaderLibraryEntry } from "../../shaderRegistry";
import threshold from "./threshold.glsl";

export const meta: ShaderLibraryEntry = {
	id: "threshold",
	glsl: threshold,
	paramsSchema: [
		{
			key: "cutoff",
			uniformName: "cutoff",
			type: "float",
			defaultValue: 0.5,
			ui: { displayName: "Cutoff", min: 0.0, max: 1.0, step: 0.01 },
		},
		{
			key: "softness",
			uniformName: "softness",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Softness", min: 0.0, max: 0.5, step: 0.01 },
		},
		{
			key: "use_luminance",
			uniformName: "use_luminance",
			type: "bool",
			defaultValue: true,
			ui: { displayName: "Use Luminance" },
		},
		{
			key: "output_color",
			uniformName: "output_color",
			type: "color",
			defaultValue: [1.0, 1.0, 1.0, 1.0],
			ui: { displayName: "Output Color" },
		},
		{
			key: "bg_color",
			uniformName: "bg_color",
			type: "color",
			defaultValue: [0.0, 0.0, 0.0, 1.0],
			ui: { displayName: "Background Color" },
		},
	],
	aiHints: {
		description:
			"Converts input into a hard or soft mask using luminance or average RGB with configurable foreground/background colors",
		aliases: ["threshold", "binary", "cutoff", "mask", "key", "matte"],
		category: "utility",
		combinability: ["lookup", "math", "fogOfWar", "pixelateScreen", "halftone"],
	},
};
