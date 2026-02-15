import type { ShaderLibraryEntry } from "../../shaderRegistry";
import rbFaultyTerminal from "./rbFaultyTerminal.glsl";

export const meta: ShaderLibraryEntry = {
	id: "rbFaultyTerminal",
	glsl: rbFaultyTerminal,
	paramsSchema: [
		{
			key: "u_scale",
			uniformName: "u_scale",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Scale", min: 0.5, max: 4.0, step: 0.01 },
		},
		{
			key: "u_digit_size",
			uniformName: "u_digit_size",
			type: "float",
			defaultValue: 1.5,
			ui: { displayName: "Digit Size", min: 0.5, max: 3.0, step: 0.01 },
		},
		{
			key: "u_scanline_intensity",
			uniformName: "u_scanline_intensity",
			type: "float",
			defaultValue: 0.3,
			ui: { displayName: "Scanline Intensity", min: 0.0, max: 1.0, step: 0.01 },
		},
		{
			key: "u_glitch_amount",
			uniformName: "u_glitch_amount",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Glitch Amount", min: 0.0, max: 2.0, step: 0.01 },
		},
		{
			key: "u_chromatic_aberration",
			uniformName: "u_chromatic_aberration",
			type: "float",
			defaultValue: 0.0,
			ui: {
				displayName: "Chromatic Aberration",
				min: 0.0,
				max: 8.0,
				step: 0.1,
			},
		},
		{
			key: "u_curvature",
			uniformName: "u_curvature",
			type: "float",
			defaultValue: 0.2,
			ui: { displayName: "Curvature", min: 0.0, max: 0.4, step: 0.01 },
		},
		{
			key: "u_brightness",
			uniformName: "u_brightness",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Brightness", min: 0.0, max: 2.0, step: 0.01 },
		},
	],
	aiHints: {
		description:
			"React Bits faulty terminal generator with digital glyph noise, scanline shimmer, and CRT curvature",
		aliases: [
			"react bits faulty terminal",
			"retro terminal",
			"crt digits",
			"hacker screen",
			"digital glitch",
		],
		category: "generator",
		combinability: ["vignette", "chromaticAberration", "oldFilm", "scanlines"],
	},
};
