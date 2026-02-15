import type { ShaderLibraryEntry } from "../../shaderRegistry";
import constantColor from "./constantColor.glsl";

export const meta: ShaderLibraryEntry = {
	id: "constantColor",
	glsl: constantColor,
	paramsSchema: [
		{
			key: "fill_color",
			uniformName: "fill_color",
			type: "color",
			defaultValue: [1.0, 1.0, 1.0, 1.0],
			ui: { displayName: "Fill Color" },
		},
		{
			key: "opacity",
			uniformName: "opacity",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Opacity", min: 0.0, max: 1.0, step: 0.01 },
		},
	],
	aiHints: {
		description:
			"Solid color fill generator with opacity control for flat backgrounds, masks, and compositing plates",
		aliases: ["solid", "flat color", "fill"],
		category: "generator",
		combinability: ["level", "colorGrading", "vignette", "blur", "bloom"],
	},
};
