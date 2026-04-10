import type { Meta, StoryObj } from "@storybook/react";
import { PenCanvasFixture } from "../PenCanvasFixture";

const meta: Meta<typeof PenCanvasFixture> = {
	title: "Pencil/Connection",
	component: PenCanvasFixture,
	tags: ["!autodocs"],
	parameters: {
		docs: { disable: true },
		previewTabs: { "storybook/docs/panel": { hidden: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const SimpleArrow: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					type: "rectangle",
					id: "simple-from",
					x: 120,
					y: 140,
					width: 120,
					height: 90,
					cornerRadius: 12,
					fill: "#93c5fd",
				},
				{
					type: "rectangle",
					id: "simple-to",
					x: 360,
					y: 140,
					width: 120,
					height: 90,
					cornerRadius: 12,
					fill: "#86efac",
				},
				{
					type: "connection",
					id: "simple-conn",
					fromId: "simple-from",
					toId: "simple-to",
				},
			],
		},
	},
};

export const ThreeNodeChain: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					type: "rectangle",
					id: "chain-a",
					x: 60,
					y: 140,
					width: 100,
					height: 80,
					cornerRadius: 10,
					fill: "#fca5a5",
				},
				{
					type: "rectangle",
					id: "chain-b",
					x: 200,
					y: 140,
					width: 100,
					height: 80,
					cornerRadius: 10,
					fill: "#fdba74",
				},
				{
					type: "rectangle",
					id: "chain-c",
					x: 340,
					y: 140,
					width: 100,
					height: 80,
					cornerRadius: 10,
					fill: "#bef264",
				},
				{
					type: "connection",
					id: "chain-conn-1",
					fromId: "chain-a",
					toId: "chain-b",
				},
				{
					type: "connection",
					id: "chain-conn-2",
					fromId: "chain-b",
					toId: "chain-c",
				},
			],
		},
	},
};

export const SelfLoop: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					type: "rectangle",
					id: "self-rect",
					x: 200,
					y: 120,
					width: 140,
					height: 100,
					cornerRadius: 12,
					fill: "#c4b5fd",
				},
				{
					type: "connection",
					id: "self-conn",
					fromId: "self-rect",
					toId: "self-rect",
				},
			],
		},
	},
};

export const StarTopology: Story = {
	args: {
		document: {
			version: 1,
			children: [
				{
					type: "rectangle",
					id: "star-center",
					x: 230,
					y: 150,
					width: 100,
					height: 80,
					cornerRadius: 10,
					fill: "#fcd34d",
				},
				{
					type: "rectangle",
					id: "star-top",
					x: 230,
					y: 40,
					width: 100,
					height: 60,
					cornerRadius: 10,
					fill: "#a5f3fc",
				},
				{
					type: "rectangle",
					id: "star-right",
					x: 370,
					y: 150,
					width: 100,
					height: 60,
					cornerRadius: 10,
					fill: "#a5f3fc",
				},
				{
					type: "rectangle",
					id: "star-bottom",
					x: 230,
					y: 280,
					width: 100,
					height: 60,
					cornerRadius: 10,
					fill: "#a5f3fc",
				},
				{
					type: "rectangle",
					id: "star-left",
					x: 90,
					y: 150,
					width: 100,
					height: 60,
					cornerRadius: 10,
					fill: "#a5f3fc",
				},
				{
					type: "connection",
					id: "star-conn-1",
					fromId: "star-center",
					toId: "star-top",
				},
				{
					type: "connection",
					id: "star-conn-2",
					fromId: "star-center",
					toId: "star-right",
				},
				{
					type: "connection",
					id: "star-conn-3",
					fromId: "star-center",
					toId: "star-bottom",
				},
				{
					type: "connection",
					id: "star-conn-4",
					fromId: "star-center",
					toId: "star-left",
				},
			],
		},
	},
};
