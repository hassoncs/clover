import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { AmenIcon } from "../icons";
import { AmenDarkDecorator, AmenLightDecorator } from "../storybook-utils";
import { HaloBadge } from "./HaloBadge";

const meta: Meta<typeof HaloBadge> = {
	title: "Amen/Decor/HaloBadge",
	component: HaloBadge,
	tags: ["autodocs"],
	argTypes: {
		size: { control: "number" },
		haloColor: { control: "color" },
		haloWidth: { control: "number" },
		backgroundColor: { control: "color" },
		glowing: { control: "boolean" },
	},
	decorators: [AmenLightDecorator],
};

export default meta;
type Story = StoryObj<typeof HaloBadge>;

export const Default: Story = {
	args: {},
};

export const WithIcon: Story = {
	args: {},
	render: (args) => (
		<HaloBadge {...args}>
			<AmenIcon name="cross" size={24} color="#C9A84C" />
		</HaloBadge>
	),
};

export const Glowing: Story = {
	args: {
		glowing: true,
	},
	render: (args) => (
		<HaloBadge {...args}>
			<AmenIcon name="dove" size={24} color="#C9A84C" />
		</HaloBadge>
	),
};

export const LargeSize: Story = {
	args: {
		size: 80,
	},
	render: (args) => (
		<HaloBadge {...args}>
			<AmenIcon name="crown" size={40} color="#C9A84C" />
		</HaloBadge>
	),
};

export const CustomColors: Story = {
	args: {
		haloColor: "#8B4513",
		backgroundColor: "#F5F5DC",
	},
	render: (args) => (
		<HaloBadge {...args}>
			<AmenIcon name="wheat" size={24} color="#8B4513" />
		</HaloBadge>
	),
};

export const OnDark: Story = {
	args: {
		backgroundColor: "#2C2C2C",
		haloColor: "#FFFDF7",
	},
	decorators: [AmenDarkDecorator],
	render: (args) => (
		<HaloBadge {...args}>
			<AmenIcon name="star" size={24} color="#FFFDF7" />
		</HaloBadge>
	),
};
