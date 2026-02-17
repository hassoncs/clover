import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Text, View } from "react-native";
import { AmenDarkDecorator, AmenLightDecorator } from "../storybook-utils";
import { ShimmerSurface } from "./ShimmerSurface";

const meta: Meta<typeof ShimmerSurface> = {
	title: "Amen/Animation/ShimmerSurface",
	component: ShimmerSurface,
	tags: ["autodocs"],
	argTypes: {
		width: { control: "text" },
		height: { control: "text" },
		borderRadius: { control: "number" },
		shimmerColor: { control: "color" },
		baseColor: { control: "color" },
		speed: { control: { type: "range", min: 500, max: 5000, step: 100 } },
		enabled: { control: "boolean" },
	},
	decorators: [AmenLightDecorator],
};

export default meta;

type Story = StoryObj<typeof ShimmerSurface>;

export const Default: Story = {
	args: {
		width: 300,
		height: 150,
		borderRadius: 12,
		shimmerColor: "rgba(255, 215, 0, 0.15)",
		baseColor: "rgba(255, 253, 247, 1)",
		speed: 2000,
		enabled: true,
	},
	render: (args) => (
		<ShimmerSurface {...args}>
			<View style={{ padding: 20 }}>
				<Text
					style={{
						fontSize: 18,
						fontWeight: "bold",
						color: "#373028",
						opacity: 0.3,
					}}
				>
					Loading Content...
				</Text>
				<View
					style={{
						height: 10,
						width: "80%",
						backgroundColor: "#F0E6CD",
						marginTop: 10,
						borderRadius: 4,
					}}
				/>
				<View
					style={{
						height: 10,
						width: "60%",
						backgroundColor: "#F0E6CD",
						marginTop: 8,
						borderRadius: 4,
					}}
				/>
			</View>
		</ShimmerSurface>
	),
};

export const CardPlaceholder: Story = {
	args: {
		width: 200,
		height: 280,
		borderRadius: 16,
		shimmerColor: "rgba(255, 215, 0, 0.2)",
		baseColor: "#FFF1BA",
		speed: 1500,
		enabled: true,
	},
};

export const OnDark: Story = {
	args: {
		width: 300,
		height: 100,
		borderRadius: 12,
		shimmerColor: "rgba(255, 215, 0, 0.1)",
		baseColor: "#1B3A6B",
		speed: 2500,
		enabled: true,
	},
	decorators: [AmenDarkDecorator],
};
