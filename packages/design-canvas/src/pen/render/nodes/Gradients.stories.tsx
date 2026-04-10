import type { Meta, StoryObj } from "@storybook/react";
import { PenCanvasFixture } from "../PenCanvasFixture";

const meta: Meta<typeof PenCanvasFixture> = {
	title: "Pencil/Gradients",
	component: PenCanvasFixture,
	tags: ["!autodocs"],
	parameters: {
		docs: { disable: true },
		previewTabs: { "storybook/docs/panel": { hidden: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const LinearGradient: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					id: "gradient-linear-rect",
					type: "rectangle",
					x: 100,
					y: 80,
					width: 300,
					height: 200,
					cornerRadius: 16,
					fill: {
						type: "gradient",
						gradientType: "linear",
						angle: 45,
						stops: [
							{ color: "#3b82f6", position: 0 },
							{ color: "#8b5cf6", position: 1 },
						],
					},
				},
			],
		},
	},
};

export const RadialGradient: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					id: "gradient-radial-ellipse",
					type: "ellipse",
					x: 100,
					y: 60,
					width: 300,
					height: 220,
					fill: {
						type: "gradient",
						gradientType: "radial",
						centerX: 0.3,
						centerY: 0.4,
						stops: [
							{ color: "#fef08a", position: 0 },
							{ color: "#f43f5e", position: 1 },
						],
					},
				},
			],
		},
	},
};

export const AngularGradient: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					id: "gradient-angular-polygon",
					type: "polygon",
					x: 140,
					y: 60,
					width: 220,
					height: 220,
					polygonCount: 6,
					fill: {
						type: "gradient",
						gradientType: "angular",
						stops: [
							{ color: "#a78bfa", position: 0 },
							{ color: "#f472b6", position: 0.45 },
							{ color: "#fde047", position: 1 },
						],
					},
				},
			],
		},
	},
};

export const MeshGradient: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					id: "gradient-mesh-ellipse",
					type: "ellipse",
					x: 100,
					y: 60,
					width: 300,
					height: 220,
					fill: {
						type: "gradient",
						gradientType: "mesh",
						stops: [
							{ color: "#06b6d4", position: 0 },
							{ color: "#8b5cf6", position: 0.5 },
							{ color: "#ec4899", position: 1 },
						],
					},
				},
			],
		},
	},
};

export const AllFourSideBySide: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					id: "grad-linear",
					type: "rectangle",
					x: 40,
					y: 60,
					width: 120,
					height: 160,
					cornerRadius: 12,
					fill: {
						type: "gradient",
						gradientType: "linear",
						angle: 45,
						stops: [
							{ color: "#3b82f6", position: 0 },
							{ color: "#8b5cf6", position: 1 },
						],
					},
				},
				{
					id: "label-linear",
					type: "text",
					x: 40,
					y: 230,
					width: 120,
					height: 30,
					content: "Linear",
					textAlign: "center",
					fontSize: 14,
					fill: { type: "color", color: "#64748b" },
				},
				{
					id: "grad-radial",
					type: "rectangle",
					x: 175,
					y: 60,
					width: 120,
					height: 160,
					cornerRadius: 12,
					fill: {
						type: "gradient",
						gradientType: "radial",
						centerX: 0.5,
						centerY: 0.5,
						stops: [
							{ color: "#fef08a", position: 0 },
							{ color: "#f43f5e", position: 1 },
						],
					},
				},
				{
					id: "label-radial",
					type: "text",
					x: 175,
					y: 230,
					width: 120,
					height: 30,
					content: "Radial",
					textAlign: "center",
					fontSize: 14,
					fill: { type: "color", color: "#64748b" },
				},
				{
					id: "grad-angular",
					type: "rectangle",
					x: 310,
					y: 60,
					width: 120,
					height: 160,
					cornerRadius: 12,
					fill: {
						type: "gradient",
						gradientType: "angular",
						stops: [
							{ color: "#a78bfa", position: 0 },
							{ color: "#f472b6", position: 0.5 },
							{ color: "#fde047", position: 1 },
						],
					},
				},
				{
					id: "label-angular",
					type: "text",
					x: 310,
					y: 230,
					width: 120,
					height: 30,
					content: "Angular",
					textAlign: "center",
					fontSize: 14,
					fill: { type: "color", color: "#64748b" },
				},
				{
					id: "grad-mesh",
					type: "rectangle",
					x: 445,
					y: 60,
					width: 120,
					height: 160,
					cornerRadius: 12,
					fill: {
						type: "gradient",
						gradientType: "mesh",
						stops: [
							{ color: "#06b6d4", position: 0 },
							{ color: "#8b5cf6", position: 0.5 },
							{ color: "#ec4899", position: 1 },
						],
					},
				},
				{
					id: "label-mesh",
					type: "text",
					x: 445,
					y: 230,
					width: 120,
					height: 30,
					content: "Mesh",
					textAlign: "center",
					fontSize: 14,
					fill: { type: "color", color: "#64748b" },
				},
			],
		},
	},
};
