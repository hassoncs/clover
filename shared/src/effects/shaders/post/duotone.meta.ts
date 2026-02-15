import type { ShaderLibraryEntry } from "../../shaderRegistry";
import duotone from "./duotone.glsl";

export const meta: ShaderLibraryEntry = {
	id: "duotone",
	glsl: duotone,
	paramsSchema: [
		{
			key: "color_dark",
			uniformName: "color_dark",
			type: "color",
			defaultValue: [0.05, 0.05, 0.2, 1.0],
			ui: { displayName: "Dark Color" },
		},
		{
			key: "color_light",
			uniformName: "color_light",
			type: "color",
			defaultValue: [1.0, 0.8, 0.5, 1.0],
			ui: { displayName: "Light Color" },
		},
		{
			key: "intensity",
			uniformName: "intensity",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Intensity", min: 0.0, max: 1.0, step: 0.05 },
		},
	],
	aiHints: {
		description:
			"Maps luminance into a two-color palette for stylized cinematic duotone grades",
		aliases: ["duotone", "two-tone", "dual color", "instagram filter"],
		category: "color",
		combinability: ["filmGrain", "vignette", "blur", "sharpen"],
	},
};
