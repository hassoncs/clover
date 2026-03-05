import type { Meta, StoryObj } from "@storybook/react";
import { PenCanvasFixture } from "../PenCanvasFixture";

const meta: Meta<typeof PenCanvasFixture> = {
	title: "Pencil/Text",
	component: PenCanvasFixture,
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Simple: Story = {
	args: {
		document: {
			children: [
				{
					id: "text-1",
					type: "text",
					x: 50,
					y: 50,
					width: 300,
					height: 100,
					content: "Hello Pencil Canvas!",
					fontSize: 24,
					fill: { type: "color", color: "#1e293b" },
				},
			],
		},
	},
};
