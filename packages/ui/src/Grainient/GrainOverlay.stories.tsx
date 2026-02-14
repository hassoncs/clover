import type { Meta, StoryObj } from "@storybook/react";
import { View } from "react-native";
import { GrainOverlay } from "./index";

const BLEND_MODES = [
	"overlay",
	"multiply",
	"soft-light",
	"screen",
	"darken",
	"lighten",
	"color-dodge",
	"color-burn",
	"hard-light",
	"difference",
	"exclusion",
	"hue",
	"saturation",
	"color",
	"luminosity",
] as const;

const meta: Meta<typeof GrainOverlay> = {
	title: "Grainient/GrainOverlay",
	component: GrainOverlay,
	argTypes: {
		opacity: {
			control: { type: "range", min: 0, max: 1, step: 0.01 },
			defaultValue: 0.1,
		},
		blendMode: {
			control: "select",
			options: BLEND_MODES,
			defaultValue: "overlay",
		},
	},
};

export default meta;

type Story = StoryObj<typeof GrainOverlay>;

export const Default: Story = {
	args: {
		opacity: 0.1,
		blendMode: "overlay",
	},
	decorators: [
		(Story) => (
			<View
				style={{
					width: 400,
					height: 300,
					backgroundColor: "#7B2FBE",
					position: "relative",
				}}
			>
				<Story />
			</View>
		),
	],
};

export const Green: Story = {
	args: {
		opacity: 0.15,
		blendMode: "overlay",
	},
	decorators: [
		(Story) => (
			<View
				style={{
					width: 400,
					height: 300,
					backgroundColor: "#22C55E",
					position: "relative",
				}}
			>
				<Story />
			</View>
		),
	],
};

export const Dark: Story = {
	args: {
		opacity: 0.2,
		blendMode: "overlay",
	},
	decorators: [
		(Story) => (
			<View
				style={{
					width: 400,
					height: 300,
					backgroundColor: "#1a1a2e",
					position: "relative",
				}}
			>
				<Story />
			</View>
		),
	],
};

export const Strong: Story = {
	args: {
		opacity: 0.5,
		blendMode: "multiply",
	},
	decorators: [
		(Story) => (
			<View
				style={{
					width: 400,
					height: 300,
					backgroundColor: "#7B2FBE",
					position: "relative",
				}}
			>
				<Story />
			</View>
		),
	],
};
