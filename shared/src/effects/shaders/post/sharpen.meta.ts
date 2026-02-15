import type { ShaderLibraryEntry } from "../../shaderRegistry";
import sharpen from "./sharpen.glsl";

export const meta: ShaderLibraryEntry = {
	id: "sharpen",
	glsl: sharpen,
	paramsSchema: [
		{
			key: "strength",
			uniformName: "strength",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Strength", min: 0.0, max: 5.0, step: 0.1 },
		},
		{
			key: "radius",
			uniformName: "radius",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Radius", min: 0.5, max: 5.0, step: 0.1 },
		},
	],
	aiHints: {
		description:
			"Unsharp-mask style detail enhancement using a 4-neighbor laplacian kernel for crisp edges",
		aliases: ["sharpen", "unsharp mask", "crisp", "detail enhance"],
		category: "blur",
		combinability: ["colorGrading", "duotone", "gradientMap", "vignette"],
	},
};
