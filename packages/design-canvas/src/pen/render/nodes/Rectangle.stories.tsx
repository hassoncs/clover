import type { Meta, StoryObj } from "@storybook/react";
import { PenCanvasFixture } from "../PenCanvasFixture";

const meta: Meta<typeof PenCanvasFixture> = {
	title: "Pencil/Rectangle",
	component: PenCanvasFixture,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const SolidColor: Story = {
	args: {
		document: {
			children: [
				{
					id: "rect-1",
					type: "rectangle",
					x: 100,
					y: 100,
					width: 200,
					height: 150,
					fill: { type: "color", color: "#3b82f6" },
				},
			],
		},
	},
};

export const RoundedCorners: Story = {
	args: {
		document: {
			children: [
				{
					id: "rect-2",
					type: "rectangle",
					x: 100,
					y: 100,
					width: 200,
					height: 150,
					cornerRadius: 24,
					fill: { type: "color", color: "#10b981" },
				},
			],
		},
	},
};
