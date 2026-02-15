import type { ShaderLibraryEntry } from "../../shaderRegistry";
import rectangle from "./rectangle.glsl";

export const meta: ShaderLibraryEntry = {
	id: "rectangle",
	glsl: rectangle,
	paramsSchema: [
		{
			key: "size",
			uniformName: "size",
			type: "vec2",
			defaultValue: [0.8, 0.6],
			ui: { displayName: "Size" },
		},
		{
			key: "corner_radius",
			uniformName: "corner_radius",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Corner Radius", min: 0.0, max: 0.5, step: 0.005 },
		},
		{
			key: "softness",
			uniformName: "softness",
			type: "float",
			defaultValue: 0.02,
			ui: { displayName: "Softness", min: 0.0, max: 0.5, step: 0.005 },
		},
		{
			key: "fill_color",
			uniformName: "fill_color",
			type: "color",
			defaultValue: [1.0, 1.0, 1.0, 1.0],
			ui: { displayName: "Fill Color" },
		},
		{
			key: "bg_color",
			uniformName: "bg_color",
			type: "color",
			defaultValue: [0.0, 0.0, 0.0, 0.0],
			ui: { displayName: "Background Color" },
		},
		{
			key: "center",
			uniformName: "center",
			type: "vec2",
			defaultValue: [0.5, 0.5],
			ui: { displayName: "Center" },
		},
	],
	aiHints: {
		description:
			"Procedural rectangle generator with size, rounded corners, softness, center positioning, and foreground/background colors",
		aliases: ["rect", "box", "square", "rounded rectangle"],
		category: "generator",
		combinability: ["lfo", "ramp", "blur", "bloom", "vignette"],
	},
};
