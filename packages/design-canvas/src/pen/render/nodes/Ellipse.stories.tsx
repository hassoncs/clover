import type { Meta, StoryObj } from "@storybook/react";
import { PenCanvasFixture } from "../PenCanvasFixture";

const meta: Meta<typeof PenCanvasFixture> = {
	title: "Pencil/Ellipse",
	component: PenCanvasFixture,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Circle: Story = {
	args: {
		document: {
			children: [
				{
					id: "ell-1",
					type: "ellipse",
					x: 100,
					y: 100,
					width: 150,
					height: 150,
					fill: { type: "color", color: "#f59e0b" },
				},
			],
		},
	},
};

export const Oval: Story = {
	args: {
		document: {
			children: [
				{
					id: "ell-2",
					type: "ellipse",
					x: 100,
					y: 100,
					width: 200,
					height: 100,
					fill: { type: "color", color: "#8b5cf6" },
				},
			],
		},
	},
};
