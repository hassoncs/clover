import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Text, View } from "react-native";
import { AmenDarkDecorator, AmenLightDecorator } from "../storybook-utils";
import { PatternBackground } from "./PatternBackground";

const meta: Meta<typeof PatternBackground> = {
	title: "Amen/Decor/PatternBackground",
	component: PatternBackground,
	tags: ["autodocs"],
	argTypes: {
		pattern: {
			control: "select",
			options: ["crosses", "dots", "fish"],
		},
		color: { control: "color" },
		spacing: { control: "number" },
	},
	decorators: [AmenLightDecorator],
	render: (args) => (
		<PatternBackground {...args} style={{ width: 300, height: 200 }} />
	),
};

export default meta;
type Story = StoryObj<typeof PatternBackground>;

export const Default: Story = {
	args: {
		pattern: "crosses",
	},
};

export const Dots: Story = {
	args: {
		pattern: "dots",
	},
};

export const Fish: Story = {
	args: {
		pattern: "fish",
	},
};

export const DenseSpacing: Story = {
	args: {
		spacing: 20,
	},
};

export const WithContent: Story = {
	args: {
		children: (
			<View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
				<Text style={{ fontSize: 18, fontWeight: "bold", color: "#8B4513" }}>
					Content Overlay
				</Text>
			</View>
		),
	},
};

export const OnDark: Story = {
	args: {
		color: "rgba(255, 253, 247, 0.1)",
	},
	decorators: [AmenDarkDecorator],
};
