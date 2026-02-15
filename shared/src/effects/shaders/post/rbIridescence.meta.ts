import type { ShaderLibraryEntry } from "../../shaderRegistry";
import rbIridescence from "./rbIridescence.glsl";

export const meta: ShaderLibraryEntry = {
	id: "rbIridescence",
	glsl: rbIridescence,
	paramsSchema: [
		{
			key: "u_color",
			uniformName: "u_color",
			type: "color",
			defaultValue: [1.0, 1.0, 1.0, 1.0],
			ui: { displayName: "Color" },
		},
		{
			key: "u_amplitude",
			uniformName: "u_amplitude",
			type: "float",
			defaultValue: 0.1,
			ui: { displayName: "Amplitude", min: 0.0, max: 1.0, step: 0.01 },
		},
		{
			key: "u_speed",
			uniformName: "u_speed",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Speed", min: 0.0, max: 5.0, step: 0.05 },
		},
	],
	aiHints: {
		description:
			"Iridescent fullscreen generator with layered cosine interference and optional mouse-reactive offset",
		aliases: [
			"react bits iridescence",
			"oil slick",
			"pearlescent",
			"interference colors",
			"chromatic swirl",
		],
		category: "generator",
		combinability: ["vignette", "chromaticAberration", "bloom", "colorGrading"],
	},
};
