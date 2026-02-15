import type { ShaderLibraryEntry } from '../../shaderRegistry';
import silhouette from "./silhouette.glsl";

export const meta: ShaderLibraryEntry = {
	id: "silhouette",
	glsl: silhouette,
	paramsSchema: [
		{
			key: "silhouette_color",
			uniformName: "silhouette_color",
			type: "color",
			defaultValue: [0.0, 0.0, 0.0, 0.5],
			ui: { displayName: "Silhouette Color" },
		},
		{
			key: "alpha_threshold",
			uniformName: "alpha_threshold",
			type: "float",
			defaultValue: 0.1,
			ui: { displayName: "Alpha Threshold", min: 0.0, max: 1.0, step: 0.05 },
		},
	],
	aiHints: {
		description:
			"Replaces visible pixels with a solid color, creating a flat silhouette of the sprite",
		aliases: ["shadow shape", "flat color", "silhouette", "solid fill"],
		category: "color",
		combinability: ["outline", "dropShadow", "glow"],
	},
};
