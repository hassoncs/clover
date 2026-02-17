import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { AmenLightDecorator } from "../storybook-utils";
import { AmenIcon } from "./AmenIcon";
import { amenIconNames } from "./registry";

const meta: Meta<typeof AmenIcon> = {
	title: "Amen/Icons/AmenIcon",
	component: AmenIcon,
	tags: ["autodocs"],
	argTypes: {
		name: {
			control: "select",
			options: amenIconNames,
		},
		size: {
			control: { type: "range", min: 12, max: 128, step: 4 },
		},
		color: {
			control: "color",
		},
		glow: {
			control: "boolean",
		},
	},
	decorators: [AmenLightDecorator],
};

export default meta;

type Story = StoryObj<typeof AmenIcon>;

export const Default: Story = {
	args: {
		name: "cross",
		size: 48,
		color: "#C9A84C",
		glow: false,
	},
};

export const WithGlow: Story = {
	args: {
		name: "dove",
		size: 48,
		color: "#FFD700",
		glow: true,
	},
};

export const IconGallery: Story = {
	render: () => (
		<ScrollView contentContainerStyle={{ padding: 24 }}>
			<Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 24 }}>
				Icon Gallery
			</Text>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 24 }}>
				{amenIconNames.map((name) => (
					<View key={name} style={{ alignItems: "center", width: 100 }}>
						<AmenIcon name={name} size={32} color="#373028" />
						<Text
							style={{
								fontSize: 12,
								marginTop: 8,
								color: "#6B7280",
								textAlign: "center",
							}}
						>
							{name}
						</Text>
					</View>
				))}
			</View>
		</ScrollView>
	),
};
