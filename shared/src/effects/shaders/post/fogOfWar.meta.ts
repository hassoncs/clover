import type { ShaderLibraryEntry } from "../../shaderRegistry";
import fogOfWar from "./fogOfWar.glsl";

export const meta: ShaderLibraryEntry = {
	id: "fogOfWar",
	glsl: fogOfWar,
	paramsSchema: [
		{
			key: "fog_color",
			uniformName: "fog_color",
			type: "color",
			defaultValue: [0.0, 0.0, 0.0, 0.5],
			ui: { displayName: "Fog Color" },
		},
		{
			key: "unexplored_color",
			uniformName: "unexplored_color",
			type: "color",
			defaultValue: [0.0, 0.0, 0.0, 1.0],
			ui: { displayName: "Unexplored Color" },
		},
		{
			key: "smoothness",
			uniformName: "smoothness",
			type: "float",
			defaultValue: 0.05,
			ui: { displayName: "Edge Smoothness", min: 0.0, max: 0.2, step: 0.01 },
		},
	],
	aiHints: {
		description:
			"Mask-driven fog system that hides unexplored areas and dims previously-seen but not currently-visible areas",
		aliases: [
			"fog",
			"war fog",
			"exploration mask",
			"visibility mask",
			"shroud",
		],
		category: "composite",
		combinability: ["vignette", "colorGrading", "blur"],
	},
};
