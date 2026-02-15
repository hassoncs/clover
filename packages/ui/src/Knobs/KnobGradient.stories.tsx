import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { View } from "react-native";
import { KnobGradient } from "./KnobGradient";
import type { GradientStop } from "./types";

const meta = {
	title: "UI/Knobs/Gradient",
	component: KnobGradient,
	decorators: [
		(Story) => (
			<View style={{ padding: 16, backgroundColor: "#111827", minHeight: 400 }}>
				<Story />
			</View>
		),
	],
	argTypes: {
		onChange: { action: "changed" },
	},
} satisfies Meta<typeof KnobGradient>;

export default meta;

type Story = StoryObj<typeof meta>;

const Template = (args: any) => {
	const [value, setValue] = useState<GradientStop[]>(args.value);
	return <KnobGradient {...args} value={value} onChange={setValue} />;
};

export const TwoStops: Story = {
	render: Template,
	args: {
		label: "Sky Gradient",
		description: "Simple 2-stop gradient",
		value: [
			{ position: 0, color: "#000000" },
			{ position: 1, color: "#ffffff" },
		],
	},
};

export const FourStops: Story = {
	render: Template,
	args: {
		label: "Complex Gradient",
		value: [
			{ position: 0, color: "#ff0000" },
			{ position: 0.33, color: "#00ff00" },
			{ position: 0.66, color: "#0000ff" },
			{ position: 1, color: "#ffff00" },
		],
	},
};

export const Sunset: Story = {
	render: Template,
	args: {
		label: "Sunset",
		value: [
			{ position: 0, color: "#1e3a8a" }, // Dark blue
			{ position: 0.4, color: "#c026d3" }, // Purple
			{ position: 0.7, color: "#f97316" }, // Orange
			{ position: 1, color: "#fef08a" }, // Yellow
		],
	},
};

export const Disabled: Story = {
	render: Template,
	args: {
		label: "Disabled Gradient",
		disabled: true,
		value: [
			{ position: 0, color: "#000000" },
			{ position: 1, color: "#ffffff" },
		],
	},
};
