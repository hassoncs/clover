import type { Meta, StoryObj } from "@storybook/react";
import { PenCanvasFixture } from "../PenCanvasFixture";

const meta: Meta<typeof PenCanvasFixture> = {
	title: "Pencil/Polygon",
	component: PenCanvasFixture,
	tags: ["!autodocs"],
	parameters: {
		docs: { disable: true },
		previewTabs: { "storybook/docs/panel": { hidden: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Triangle: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					id: "polygon-triangle",
					type: "polygon",
					x: 160,
					y: 60,
					width: 220,
					height: 220,
					polygonCount: 3,
					fill: { type: "color", color: "#3b82f6" },
				},
			],
		},
	},
};

export const Pentagon: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					id: "polygon-pentagon",
					type: "polygon",
					x: 140,
					y: 50,
					width: 220,
					height: 220,
					polygonCount: 5,
					fill: {
						type: "gradient",
						gradientType: "linear",
						angle: 90,
						stops: [
							{ color: "#f97316", position: 0 },
							{ color: "#dc2626", position: 1 },
						],
					},
				},
			],
		},
	},
};

export const Hexagon: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					id: "polygon-hexagon",
					type: "polygon",
					x: 140,
					y: 50,
					width: 220,
					height: 220,
					polygonCount: 6,
					cornerRadius: 12,
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

export const Star8: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					id: "polygon-star8",
					type: "polygon",
					x: 140,
					y: 50,
					width: 220,
					height: 220,
					polygonCount: 8,
					cornerRadius: 8,
					fill: {
						type: "gradient",
						gradientType: "linear",
						angle: 135,
						stops: [
							{ color: "#06b6d4", position: 0 },
							{ color: "#8b5cf6", position: 1 },
						],
					},
					stroke: { fill: "#4c1d95", thickness: 2 },
				},
			],
		},
	},
};

export const RoundedTriangle: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					id: "polygon-rounded-tri",
					type: "polygon",
					x: 160,
					y: 60,
					width: 220,
					height: 220,
					polygonCount: 3,
					cornerRadius: 20,
					fill: { type: "color", color: "#fda4af" },
					stroke: { fill: "#be123c", thickness: 3 },
				},
			],
		},
	},
};
