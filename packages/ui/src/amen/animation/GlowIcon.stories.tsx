import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { AmenIcon } from "../icons/AmenIcon";
import { AmenDarkDecorator, AmenLightDecorator } from "../storybook-utils";
import { GlowIcon } from "./GlowIcon";

const meta: Meta<typeof GlowIcon> = {
	title: "Amen/Animation/GlowIcon",
	component: GlowIcon,
	tags: ["autodocs"],
	argTypes: {
		color: { control: "color" },
		intensity: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
		speed: { control: { type: "range", min: 500, max: 5000, step: 100 } },
		enabled: { control: "boolean" },
	},
	decorators: [AmenLightDecorator],
};

export default meta;

type Story = StoryObj<typeof GlowIcon>;

export const Default: Story = {
	args: {
		color: "#FFD700",
		intensity: 0.8,
		speed: 2000,
		enabled: true,
	},
	render: (args) => (
		<GlowIcon {...args}>
			<AmenIcon name="cross" size={48} color="#C9A84C" />
		</GlowIcon>
	),
};

export const Subtle: Story = {
	args: {
		color: "#FFD700",
		intensity: 0.4,
		speed: 3000,
		enabled: true,
	},
	render: (args) => (
		<GlowIcon {...args}>
			<AmenIcon name="dove" size={48} color="#C9A84C" />
		</GlowIcon>
	),
};

export const Strong: Story = {
	args: {
		color: "#FF4500",
		intensity: 1.0,
		speed: 1000,
		enabled: true,
	},
	render: (args) => (
		<GlowIcon {...args}>
			<AmenIcon name="flame" size={48} color="#FF4500" />
		</GlowIcon>
	),
};

export const OnDark: Story = {
	args: {
		color: "#FFD700",
		intensity: 0.8,
		speed: 2000,
		enabled: true,
	},
	decorators: [AmenDarkDecorator],
	render: (args) => (
		<GlowIcon {...args}>
			<AmenIcon name="cross" size={48} color="#FFD700" />
		</GlowIcon>
	),
};
