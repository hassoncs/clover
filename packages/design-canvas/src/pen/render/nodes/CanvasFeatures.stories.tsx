import type { Meta, StoryObj } from "@storybook/react";
import { PenCanvasFixture } from "../PenCanvasFixture";

const meta: Meta<typeof PenCanvasFixture> = {
	title: "Pencil/Canvas Features",
	component: PenCanvasFixture,
	tags: ["!autodocs"],
	parameters: {
		docs: { disable: true },
		previewTabs: { "storybook/docs/panel": { hidden: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const AutoLayoutHorizontal: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					type: "frame",
					id: "layout-h",
					x: 60,
					y: 100,
					width: 560,
					height: 180,
					layout: "horizontal",
					padding: [20, 24],
					gap: 16,
					justifyContent: "space-between",
					alignItems: "center",
					fill: "#f8fafc",
					stroke: { fill: "#94a3b8", thickness: 2 },
					children: [
						{
							type: "rectangle",
							id: "layout-card-1",
							width: "fill_container",
							height: 100,
							cornerRadius: 16,
							fill: "#93c5fd",
						},
						{
							type: "rectangle",
							id: "layout-card-2",
							width: "fill_container",
							height: 100,
							cornerRadius: 16,
							fill: "#86efac",
						},
						{
							type: "rectangle",
							id: "layout-card-3",
							width: "fill_container",
							height: 100,
							cornerRadius: 16,
							fill: "#fcd34d",
						},
					],
				},
			],
		},
	},
};

export const AutoLayoutVerticalAndFitContent: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					type: "frame",
					id: "layout-v",
					x: 80,
					y: 60,
					width: 420,
					height: "fit_content",
					layout: "vertical",
					padding: [20, 20, 24, 20],
					gap: 12,
					alignItems: "stretch",
					fill: "#0f172a",
					cornerRadius: 18,
					children: [
						{
							type: "text",
							id: "v-title",
							width: "fill_container",
							height: "fit_content",
							content: "Layout + fit_content",
							fontSize: 28,
							fontWeight: "700",
							fill: "#f8fafc",
						},
						{
							type: "text",
							id: "v-sub",
							width: "fill_container",
							height: "fit_content",
							content: "Children drive parent height; text drives own size.",
							fontSize: 18,
							fill: "#cbd5e1",
						},
						{
							type: "rectangle",
							id: "v-chip",
							width: 180,
							height: 48,
							cornerRadius: 999,
							fill: "#38bdf8",
						},
					],
				},
			],
		},
	},
};

export const ClipTransformAndOpacity: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					type: "frame",
					id: "clip-parent",
					x: 130,
					y: 70,
					width: 340,
					height: 260,
					clip: true,
					rotation: -8,
					fill: "#111827",
					cornerRadius: 20,
					children: [
						{
							type: "rectangle",
							id: "clip-outside",
							x: 220,
							y: 170,
							width: 200,
							height: 160,
							rotation: 18,
							opacity: 0.6,
							fill: "#f43f5e",
						},
						{
							type: "rectangle",
							id: "clip-flipped",
							x: 30,
							y: 30,
							width: 180,
							height: 120,
							flipX: true,
							fill: {
								type: "gradient",
								gradientType: "linear",
								angle: 12,
								stops: [
									{ color: "#34d399", position: 0 },
									{ color: "#059669", position: 1 },
								],
							},
						},
					],
				},
			],
		},
	},
};

export const VariablesThemesAndRefs: Story = {
	args: {
		document: {
			version: 1,
			themes: [{ name: "mode", values: ["light", "dark"], default: "light" }],
			variables: {
				brand: {
					type: "color",
					value: [
						{ value: "#0ea5e9", theme: { mode: "light" } },
						{ value: "#22d3ee", theme: { mode: "dark" } },
					],
				},
				cardBg: {
					type: "color",
					value: [
						{ value: "#ffffff", theme: { mode: "light" } },
						{ value: "#0f172a", theme: { mode: "dark" } },
					],
				},
			},
			children: [
				{
					type: "frame",
					id: "card-def",
					reusable: true,
					visible: false,
					x: -10000,
					y: -10000,
					width: 220,
					height: 140,
					cornerRadius: 16,
					fill: "$--cardBg",
					stroke: { fill: "$--brand", thickness: 3 },
					children: [
						{
							type: "text",
							id: "title",
							x: 16,
							y: 16,
							width: 180,
							height: 40,
							content: "Reusable Card",
							fontSize: 20,
							fill: "$--brand",
						},
					],
				},
				{
					type: "ref",
					id: "card-a",
					ref: "card-def",
					x: 80,
					y: 80,
					theme: { mode: "light" },
					descendants: {
						title: { content: "Light theme" },
					},
				},
				{
					type: "ref",
					id: "card-b",
					ref: "card-def",
					x: 340,
					y: 80,
					theme: { mode: "dark" },
					descendants: {
						title: { content: "Dark theme" },
					},
				},
			],
		},
	},
};

export const FillStrokeEffectsAndSelection: Story = {
	args: {
		selectedNodePaths: [["fx-rect"], ["fx-path"]],
		hoveredNodePath: ["fx-ellipse"],
		penDrawingState: {
			anchors: [
				{
					docX: 110,
					docY: 300,
					handleInDocX: 110,
					handleInDocY: 300,
					handleOutDocX: 160,
					handleOutDocY: 260,
				},
				{
					docX: 220,
					docY: 300,
					handleInDocX: 170,
					handleInDocY: 340,
					handleOutDocX: 270,
					handleOutDocY: 260,
				},
			],
			cursorDocX: 320,
			cursorDocY: 320,
			isDraggingHandle: false,
		},
		document: {
			version: 1,
			children: [
				{
					type: "rectangle",
					id: "fx-rect",
					x: 70,
					y: 70,
					width: 180,
					height: 140,
					cornerRadius: 20,
					fill: [
						{ type: "color", color: "#1d4ed8", opacity: 0.7 },
						{
							type: "gradient",
							gradientType: "linear",
							angle: 45,
							stops: [
								{ color: "#38bdf8", position: 0 },
								{ color: "#22c55e", position: 1 },
							],
						},
					],
					stroke: {
						fill: "#0f172a",
						thickness: 4,
						dashPattern: [10, 6],
						join: "round",
					},
					effects: [
						{
							shadow: {
								color: "rgba(2,6,23,0.45)",
								offsetX: 0,
								offsetY: 10,
								blur: 18,
							},
						},
					],
				},
				{
					type: "ellipse",
					id: "fx-ellipse",
					x: 290,
					y: 80,
					width: 180,
					height: 120,
					fill: {
						type: "gradient",
						gradientType: "mesh",
						stops: [
							{ color: "#f472b6", position: 0 },
							{ color: "#facc15", position: 0.5 },
							{ color: "#a78bfa", position: 1 },
						],
					},
					stroke: { fill: "#881337", thickness: 3, cap: "round" },
				},
				{
					type: "path",
					id: "fx-path",
					x: 260,
					y: 220,
					width: 260,
					height: 140,
					geometry:
						"M 20 60 C 60 20 120 20 160 60 C 200 100 240 100 260 70 L 260 120 L 20 120 Z",
					fill: {
						type: "image",
						url: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80",
						fit: "cover",
					},
					stroke: { fill: "#0f172a", thickness: 2 },
				},
			],
		},
	},
};
