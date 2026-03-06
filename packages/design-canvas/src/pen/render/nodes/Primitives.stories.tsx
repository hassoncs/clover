import type { Meta, StoryObj } from "@storybook/react";
import { PenCanvasFixture } from "../PenCanvasFixture";

const meta: Meta<typeof PenCanvasFixture> = {
	title: "Pencil/Primitives",
	component: PenCanvasFixture,
	tags: ["!autodocs"],
	parameters: {
		docs: { disable: true },
		previewTabs: { "storybook/docs/panel": { hidden: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Frame: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					type: "frame",
					id: "frame-1",
					x: 80,
					y: 80,
					width: 320,
					height: 220,
					cornerRadius: 24,
					fill: { type: "color", color: "#f8fafc" },
					stroke: { fill: "#94a3b8", thickness: 2 },
					children: [
						{
							type: "rectangle",
							id: "frame-rect",
							x: 16,
							y: 16,
							width: 120,
							height: 120,
							cornerRadius: 12,
							fill: { type: "color", color: "#38bdf8" },
						},
					],
				},
			],
		},
	},
};

export const Group: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					type: "group",
					id: "group-1",
					x: 120,
					y: 80,
					rotation: 8,
					children: [
						{
							type: "rectangle",
							id: "group-r1",
							x: 0,
							y: 0,
							width: 180,
							height: 120,
							cornerRadius: 16,
							fill: { type: "color", color: "#f97316" },
						},
						{
							type: "text",
							id: "group-label",
							x: 24,
							y: 42,
							width: 160,
							height: 40,
							content: "Grouped",
							fontSize: 28,
							fill: { type: "color", color: "#ffffff" },
						},
					],
				},
			],
		},
	},
};

export const Rectangle: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					type: "rectangle",
					id: "rect-primitive",
					x: 100,
					y: 90,
					width: 300,
					height: 180,
					cornerRadius: [24, 8, 24, 8],
					fill: {
						type: "gradient",
						gradientType: "linear",
						angle: 35,
						stops: [
							{ color: "#22d3ee", position: 0 },
							{ color: "#2563eb", position: 1 },
						],
					},
					stroke: { fill: "#0f172a", thickness: 3 },
				},
			],
		},
	},
};

export const Ellipse: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					type: "ellipse",
					id: "ellipse-primitive",
					x: 120,
					y: 100,
					width: 260,
					height: 160,
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
					stroke: { fill: "#be123c", thickness: 4 },
				},
			],
		},
	},
};

export const Line: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					type: "line",
					id: "line-primitive",
					x: 90,
					y: 90,
					width: 360,
					height: 180,
					stroke: {
						fill: "#0ea5e9",
						thickness: 8,
						cap: "round",
						join: "round",
						dashPattern: [18, 10],
					},
				},
			],
		},
	},
};

export const Polygon: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					type: "polygon",
					id: "polygon-primitive",
					x: 140,
					y: 90,
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
					stroke: { fill: "#4c1d95", thickness: 3 },
				},
			],
		},
	},
};

export const Path: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					type: "path",
					id: "path-primitive",
					x: 80,
					y: 80,
					width: 340,
					height: 220,
					geometry:
						"M 170 20 C 220 0 320 25 300 95 C 285 150 230 190 170 215 C 110 190 55 150 40 95 C 20 25 120 0 170 20 Z",
					fill: { type: "color", color: "#fb7185" },
					stroke: { fill: "#be123c", thickness: 4 },
					effects: [
						{
							shadow: {
								color: "rgba(0,0,0,0.25)",
								offsetX: 0,
								offsetY: 10,
								blur: 16,
							},
						},
					],
				},
			],
		},
	},
};

export const Text: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					type: "text",
					id: "text-primitive",
					x: 70,
					y: 90,
					width: 420,
					height: 180,
					textAlign: "left",
					fontSize: 28,
					content: [
						{ content: "Pencil ", fill: "#0f172a", fontWeight: "700" },
						{
							content: "text",
							fill: "#0ea5e9",
							fontSize: 34,
							fontWeight: "700",
						},
						{ content: " spans", fill: "#334155" },
					],
					fill: "#0f172a",
				},
			],
		},
	},
};

export const Image: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					type: "image",
					id: "image-primitive",
					x: 110,
					y: 80,
					width: 320,
					height: 220,
					fit: "cover",
					url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
				},
			],
		},
	},
};

export const IconFont: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					type: "icon_font",
					id: "icon-primitive",
					x: 180,
					y: 110,
					width: 120,
					height: 120,
					icon: "rocket",
					iconFamily: "material-community",
					fill: { type: "color", color: "#7c3aed" },
				},
			],
		},
	},
};

export const Note: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					type: "note",
					id: "note-primitive",
					x: 120,
					y: 100,
					width: 260,
					height: 160,
					content: "This is a note primitive",
				},
			],
		},
	},
};

export const Connection: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					type: "rectangle",
					id: "conn-from",
					x: 120,
					y: 140,
					width: 120,
					height: 90,
					cornerRadius: 12,
					fill: "#93c5fd",
				},
				{
					type: "rectangle",
					id: "conn-to",
					x: 360,
					y: 140,
					width: 120,
					height: 90,
					cornerRadius: 12,
					fill: "#86efac",
				},
				{
					type: "connection",
					id: "conn-primitive",
					fromId: "conn-from",
					toId: "conn-to",
				},
			],
		},
	},
};
