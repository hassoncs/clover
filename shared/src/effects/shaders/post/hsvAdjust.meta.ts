import type { ShaderLibraryEntry } from "../../shaderRegistry";
import hsvAdjust from "./hsvAdjust.glsl";

export const meta: ShaderLibraryEntry = {
	id: "hsvAdjust",
	glsl: hsvAdjust,
	paramsSchema: [
		{
			key: "hue_shift",
			uniformName: "hue_shift",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Hue Shift", min: -180.0, max: 180.0, step: 1.0 },
		},
		{
			key: "saturation",
			uniformName: "saturation",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Saturation", min: 0.0, max: 3.0, step: 0.05 },
		},
		{
			key: "value",
			uniformName: "value",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Value", min: 0.0, max: 3.0, step: 0.05 },
		},
	],
	aiHints: {
		description:
			"Adjusts hue, saturation, and value by converting screen color to HSV and back to RGB",
		aliases: ["hue shift", "saturation", "HSV", "color shift"],
		category: "color",
		combinability: ["vignette", "bloom", "blur", "oldFilm", "nightVision"],
	},
};
