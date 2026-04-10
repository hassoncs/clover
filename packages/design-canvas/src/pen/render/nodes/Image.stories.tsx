import type { Meta, StoryObj } from "@storybook/react";
import { PenCanvasFixture } from "../PenCanvasFixture";

const meta: Meta<typeof PenCanvasFixture> = {
	title: "Pencil/Image",
	component: PenCanvasFixture,
	tags: ["!autodocs"],
	parameters: {
		docs: { disable: true },
		previewTabs: { "storybook/docs/panel": { hidden: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

const UNSPLASH_URL =
	"https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80";

export const Cover: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					id: "image-cover",
					type: "image",
					x: 100,
					y: 80,
					width: 320,
					height: 220,
					fit: "cover",
					url: UNSPLASH_URL,
				},
			],
		},
	},
};

export const Contain: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					id: "image-contain",
					type: "image",
					x: 100,
					y: 80,
					width: 320,
					height: 220,
					fit: "contain",
					url: UNSPLASH_URL,
				},
			],
		},
	},
};

export const Fill: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					id: "image-fill",
					type: "image",
					x: 100,
					y: 80,
					width: 320,
					height: 220,
					fit: "fill",
					url: UNSPLASH_URL,
				},
			],
		},
	},
};

export const WithShadow: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					id: "image-shadow",
					type: "image",
					x: 120,
					y: 80,
					width: 280,
					height: 200,
					fit: "cover",
					url: UNSPLASH_URL,
					effects: [
						{
							shadow: {
								color: "rgba(0,0,0,0.35)",
								offsetX: 0,
								offsetY: 12,
								blur: 24,
							},
						},
					],
				},
			],
		},
	},
};
