import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { AmenDarkDecorator, AmenLightDecorator } from "../storybook-utils";
import { MotifDivider } from "./MotifDivider";

const meta: Meta<typeof MotifDivider> = {
	title: "Amen/Decor/MotifDivider",
	component: MotifDivider,
	tags: ["autodocs"],
	argTypes: {
		icon: {
			control: "select",
			options: [
				"cross",
				"crossCeltic",
				"crossOutline",
				"dove",
				"fish",
				"lamb",
				"bible",
				"church",
				"crown",
				"chalice",
				"scroll",
				"prayingHands",
				"flame",
				"heart",
				"star",
				"anchor",
				"shield",
				"oliveBranch",
				"wheat",
				"halo",
				"angelWings",
				"alphaOmega",
			],
		},
		color: { control: "color" },
		lineColor: { control: "color" },
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
		},
	},
	decorators: [AmenLightDecorator],
};

export default meta;
type Story = StoryObj<typeof MotifDivider>;

export const Default: Story = {
	args: {},
};

export const WithDove: Story = {
	args: {
		icon: "dove",
	},
};

export const WithFish: Story = {
	args: {
		icon: "fish",
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
		lineColor: "rgba(255, 253, 247, 0.3)",
	},
	decorators: [AmenDarkDecorator],
};
