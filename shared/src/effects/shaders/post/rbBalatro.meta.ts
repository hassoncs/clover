import type { ShaderLibraryEntry } from "../../shaderRegistry";
import rbBalatro from "./rbBalatro.glsl";

export const meta: ShaderLibraryEntry = {
	id: "rbBalatro",
	glsl: rbBalatro,
	paramsSchema: [
		{
			key: "u_spin_rotation",
			uniformName: "u_spin_rotation",
			type: "float",
			defaultValue: -2.0,
			ui: { displayName: "Spin Rotation", min: -10.0, max: 10.0, step: 0.1 },
		},
		{
			key: "u_spin_speed",
			uniformName: "u_spin_speed",
			type: "float",
			defaultValue: 7.0,
			ui: { displayName: "Spin Speed", min: 0.0, max: 20.0, step: 0.1 },
		},
		{
			key: "u_contrast",
			uniformName: "u_contrast",
			type: "float",
			defaultValue: 3.5,
			ui: { displayName: "Contrast", min: 0.5, max: 8.0, step: 0.1 },
		},
		{
			key: "u_lighting",
			uniformName: "u_lighting",
			type: "float",
			defaultValue: 0.4,
			ui: { displayName: "Lighting", min: 0.0, max: 2.0, step: 0.05 },
		},
		{
			key: "u_spin_amount",
			uniformName: "u_spin_amount",
			type: "float",
			defaultValue: 0.25,
			ui: { displayName: "Spin Amount", min: 0.0, max: 1.0, step: 0.01 },
		},
		{
			key: "u_color1",
			uniformName: "u_color1",
			type: "color",
			defaultValue: [0.8706, 0.2667, 0.2314, 1.0],
			ui: { displayName: "Color 1" },
		},
		{
			key: "u_color2",
			uniformName: "u_color2",
			type: "color",
			defaultValue: [0.0, 0.4196, 0.7059, 1.0],
			ui: { displayName: "Color 2" },
		},
		{
			key: "u_color3",
			uniformName: "u_color3",
			type: "color",
			defaultValue: [0.0863, 0.1373, 0.1451, 1.0],
			ui: { displayName: "Color 3" },
		},
	],
	aiHints: {
		description:
			"Psychedelic Balatro-style swirl generator with pixel-stepped angular warping and tri-color paint mixing",
		aliases: [
			"react bits balatro",
			"card game swirl",
			"psychedelic vortex",
			"paint swirl",
			"trippy background",
		],
		category: "generator",
		combinability: ["vignette", "chromaticAberration", "bloom", "oldFilm"],
	},
};
