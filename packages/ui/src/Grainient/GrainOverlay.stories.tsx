import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { GrainOverlay } from "./index";

const meta: Meta<typeof GrainOverlay> = {
	title: "Grainient/GrainOverlay",
	component: GrainOverlay,
	decorators: [
		(Story) => (
			<View
				style={{
					width: 300,
					height: 300,
					backgroundColor: "#7B2FBE",
					position: "relative",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Story />
			</View>
		),
	],
};

export default meta;

type Story = StoryObj<typeof GrainOverlay>;

export const Default: Story = {
	args: {},
};

export const Strong: Story = {
	args: {
		opacity: 0.5,
		blendMode: "multiply",
	},
};
