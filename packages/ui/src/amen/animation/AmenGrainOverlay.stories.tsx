import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Text, View } from "react-native";
import { AmenLightDecorator } from "../storybook-utils";
import { AmenGrainOverlay } from "./AmenGrainOverlay";

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

const meta: Meta<typeof AmenGrainOverlay> = {
	title: "Amen/Animation/AmenGrainOverlay",
	component: AmenGrainOverlay,
	tags: ["autodocs"],
	argTypes: {
		intensity: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
		tint: { control: "color" },
		blendMode: {
			control: "select",
			options: BLEND_MODES,
		},
	},
	decorators: [AmenLightDecorator],
};

export default meta;

type Story = StoryObj<typeof AmenGrainOverlay>;

export const Default: Story = {
	args: {
		intensity: 0.08,
		tint: "#FFD700",
		blendMode: "overlay",
	},
	decorators: [
		(Story) => (
			<View
				style={{
					width: 300,
					height: 200,
					backgroundColor: "#FFFDF7",
					alignItems: "center",
					justifyContent: "center",
					position: "relative",
				}}
			>
				<Text style={{ fontSize: 24, fontWeight: "bold", color: "#373028" }}>
					Grain Texture
				</Text>
				<Story />
			</View>
		),
	],
};

export const Strong: Story = {
	args: {
		intensity: 0.2,
		tint: "#1B3A6B",
		blendMode: "multiply",
	},
	decorators: [
		(Story) => (
			<View
				style={{
					width: 300,
					height: 200,
					backgroundColor: "#FFFDF7",
					alignItems: "center",
					justifyContent: "center",
					position: "relative",
				}}
			>
				<Text style={{ fontSize: 24, fontWeight: "bold", color: "#373028" }}>
					Strong Grain
				</Text>
				<Story />
			</View>
		),
	],
};

export const OnDark: Story = {
	args: {
		intensity: 0.15,
		tint: "#FFD700",
		blendMode: "overlay",
	},
	decorators: [
		(Story) => (
			<View
				style={{
					width: 300,
					height: 200,
					backgroundColor: "#1B3A6B",
					alignItems: "center",
					justifyContent: "center",
					position: "relative",
				}}
			>
				<Text style={{ fontSize: 24, fontWeight: "bold", color: "#FFFDF7" }}>
					Dark Grain
				</Text>
				<Story />
			</View>
		),
	],
};
