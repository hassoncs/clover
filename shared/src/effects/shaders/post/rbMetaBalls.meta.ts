import type { ShaderLibraryEntry } from "../../shaderRegistry";
import rbMetaBalls from "./rbMetaBalls.glsl";

export const meta: ShaderLibraryEntry = {
	id: "rbMetaBalls",
	glsl: rbMetaBalls,
	paramsSchema: [
		{
			key: "u_color",
			uniformName: "u_color",
			type: "color",
			defaultValue: [1.0, 1.0, 1.0, 1.0],
			ui: { displayName: "Color" },
		},
		{
			key: "u_cursor_color",
			uniformName: "u_cursor_color",
			type: "color",
			defaultValue: [1.0, 1.0, 1.0, 1.0],
			ui: { displayName: "Cursor Color" },
		},
		{
			key: "u_cursor_ball_size",
			uniformName: "u_cursor_ball_size",
			type: "float",
			defaultValue: 3.0,
			ui: { displayName: "Cursor Ball Size", min: 0.1, max: 8.0, step: 0.01 },
		},
		{
			key: "u_clump_factor",
			uniformName: "u_clump_factor",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Clump Factor", min: 0.1, max: 3.0, step: 0.01 },
		},
	],
	aiHints: {
		description:
			"React Bits metaballs generator with animated field blobs and mouse-driven color-weighted merge",
		aliases: [
			"react bits metaballs",
			"metaballs",
			"blob field",
			"gooey blobs",
			"liquid blobs",
		],
		category: "generator",
		combinability: ["vignette", "blur", "chromaticAberration", "colorGrading"],
	},
};
