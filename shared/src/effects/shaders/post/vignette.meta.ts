import type { ShaderLibraryEntry } from "../../shaderRegistry";
import vignette from "./vignette.glsl";

export const meta: ShaderLibraryEntry = {
	id: "vignette",
	glsl: vignette,
	paramsSchema: [
		{
			key: "vignette_intensity",
			uniformName: "vignette_intensity",
			type: "float",
			defaultValue: 0.4,
			ui: { displayName: "Intensity", min: 0.0, max: 2.0, step: 0.1 },
		},
		{
			key: "vignette_opacity",
			uniformName: "vignette_opacity",
			type: "float",
			defaultValue: 0.5,
			ui: { displayName: "Opacity", min: 0.0, max: 1.0, step: 0.05 },
		},
		{
			key: "vignette_color",
			uniformName: "vignette_color",
			type: "color",
			defaultValue: [0.0, 0.0, 0.0, 1.0],
			ui: { displayName: "Vignette Color" },
		},
		{
			key: "vignette_roundness",
			uniformName: "vignette_roundness",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Roundness", min: 0.0, max: 1.0, step: 0.05 },
		},
		{
			key: "vignette_center",
			uniformName: "vignette_center",
			type: "vec2",
			defaultValue: [0.5, 0.5],
			ui: { displayName: "Center" },
		},
	],
	aiHints: {
		description:
			"Darkens the screen edges toward a color, creating a cinematic or focused look",
		aliases: [
			"edge darken",
			"corner shadow",
			"cinematic frame",
			"focus border",
		],
		category: "composite",
		combinability: ["bloom", "colorGrading", "scanlines", "crt", "blur"],
	},
};
