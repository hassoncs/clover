import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { AmenDarkDecorator, AmenLightDecorator } from "../storybook-utils";
import { SectionOrnament } from "./SectionOrnament";

const meta: Meta<typeof SectionOrnament> = {
	title: "Amen/Decor/SectionOrnament",
	component: SectionOrnament,
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["wheat", "olive", "dots", "stars"],
		},
		color: { control: "color" },
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
		},
	},
	decorators: [AmenLightDecorator],
};

export default meta;
type Story = StoryObj<typeof SectionOrnament>;

export const Default: Story = {
	args: {
		variant: "dots",
	},
};

export const Stars: Story = {
	args: {
		variant: "stars",
	},
};

export const Wheat: Story = {
	args: {
		variant: "wheat",
	},
};

export const Olive: Story = {
	args: {
		variant: "olive",
	},
};

export const SmallSize: Story = {
	args: {
		size: "sm",
	},
};

export const LargeSize: Story = {
	args: {
		size: "lg",
	},
};

export const OnDark: Story = {
	args: {
		color: "#FFFDF7",
	},
	decorators: [AmenDarkDecorator],
};
