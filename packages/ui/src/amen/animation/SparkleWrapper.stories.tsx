import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { AmenIcon } from "../icons/AmenIcon";
import { AmenDarkDecorator, AmenLightDecorator } from "../storybook-utils";
import { SparkleWrapper } from "./SparkleWrapper";

const meta: Meta<typeof SparkleWrapper> = {
	title: "Amen/Animation/SparkleWrapper",
	component: SparkleWrapper,
	tags: ["autodocs"],
	argTypes: {
		count: { control: { type: "range", min: 1, max: 12, step: 1 } },
		color: { control: "color" },
		enabled: { control: "boolean" },
	},
	decorators: [AmenLightDecorator],
};

export default meta;

type Story = StoryObj<typeof SparkleWrapper>;

export const Default: Story = {
	args: {
		count: 6,
		color: "#FFD700",
		enabled: true,
	},
	render: (args) => (
		<SparkleWrapper {...args}>
			<AmenIcon name="crown" size={48} color="#C9A84C" />
		</SparkleWrapper>
	),
};

export const Subtle: Story = {
	args: {
		count: 3,
		color: "#F0E6CD",
		enabled: true,
	},
	render: (args) => (
		<SparkleWrapper {...args}>
			<AmenIcon name="dove" size={48} color="#C9A84C" />
		</SparkleWrapper>
	),
};

export const Strong: Story = {
	args: {
		count: 12,
		color: "#FFD700",
		enabled: true,
	},
	render: (args) => (
		<SparkleWrapper {...args}>
			<AmenIcon name="chalice" size={48} color="#C9A84C" />
		</SparkleWrapper>
	),
};

export const OnDark: Story = {
	args: {
		count: 8,
		color: "#FFD700",
		enabled: true,
	},
	decorators: [AmenDarkDecorator],
	render: (args) => (
		<SparkleWrapper {...args}>
			<AmenIcon name="star" size={48} color="#FFD700" />
		</SparkleWrapper>
	),
};
