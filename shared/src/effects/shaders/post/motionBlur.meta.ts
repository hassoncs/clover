import type { ShaderLibraryEntry } from "../../shaderRegistry";
import motionBlur from "./motionBlur.glsl";

export const meta: ShaderLibraryEntry = {
	id: "motionBlur",
	glsl: motionBlur,
	paramsSchema: [
		{
			key: "velocity",
			uniformName: "velocity",
			type: "vec2",
			defaultValue: [0.0, 0.0],
			ui: { displayName: "Velocity Direction" },
		},
		{
			key: "strength",
			uniformName: "strength",
			type: "float",
			defaultValue: 0.5,
			ui: { displayName: "Strength", min: 0.0, max: 1.0, step: 0.05 },
		},
		{
			key: "radial_center",
			uniformName: "radial_center",
			type: "vec2",
			defaultValue: [0.5, 0.5],
			ui: { displayName: "Radial Center" },
		},
		{
			key: "use_radial",
			uniformName: "use_radial",
			type: "bool",
			defaultValue: false,
			ui: { displayName: "Radial Mode" },
		},
	],
	aiHints: {
		description:
			"Directional or radial motion blur that smears the image along a velocity vector for speed effects",
		aliases: ["speed blur", "directional blur", "zoom blur", "velocity blur"],
		category: "blur",
		combinability: ["speedLines", "chromaticAberration", "vignette", "bloom"],
	},
};
