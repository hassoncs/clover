import type { ShaderLibraryEntry } from "../../shaderRegistry";
import convolve from "./convolve.glsl";

export const meta: ShaderLibraryEntry = {
	id: "convolve",
	glsl: convolve,
	paramsSchema: [
		{
			key: "kernel_00",
			uniformName: "kernel_00",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Kernel 00", min: -5.0, max: 5.0, step: 0.1 },
		},
		{
			key: "kernel_01",
			uniformName: "kernel_01",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Kernel 01", min: -5.0, max: 5.0, step: 0.1 },
		},
		{
			key: "kernel_02",
			uniformName: "kernel_02",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Kernel 02", min: -5.0, max: 5.0, step: 0.1 },
		},
		{
			key: "kernel_10",
			uniformName: "kernel_10",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Kernel 10", min: -5.0, max: 5.0, step: 0.1 },
		},
		{
			key: "kernel_11",
			uniformName: "kernel_11",
			type: "float",
			defaultValue: 1.0,
			ui: { displayName: "Kernel 11", min: -5.0, max: 5.0, step: 0.1 },
		},
		{
			key: "kernel_12",
			uniformName: "kernel_12",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Kernel 12", min: -5.0, max: 5.0, step: 0.1 },
		},
		{
			key: "kernel_20",
			uniformName: "kernel_20",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Kernel 20", min: -5.0, max: 5.0, step: 0.1 },
		},
		{
			key: "kernel_21",
			uniformName: "kernel_21",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Kernel 21", min: -5.0, max: 5.0, step: 0.1 },
		},
		{
			key: "kernel_22",
			uniformName: "kernel_22",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Kernel 22", min: -5.0, max: 5.0, step: 0.1 },
		},
		{
			key: "normalize",
			uniformName: "normalize",
			type: "bool",
			defaultValue: true,
			ui: { displayName: "Normalize" },
		},
		{
			key: "bias",
			uniformName: "bias",
			type: "float",
			defaultValue: 0.0,
			ui: { displayName: "Bias", min: -1.0, max: 1.0, step: 0.01 },
		},
	],
	aiHints: {
		description:
			"Custom 3x3 convolution matrix filter for edge detection, blur, sharpen, and bespoke image kernels",
		aliases: ["convolution", "kernel", "custom filter", "matrix filter"],
		category: "utility",
		combinability: ["colorGrading", "duotone", "gradientMap", "vignette"],
	},
};
