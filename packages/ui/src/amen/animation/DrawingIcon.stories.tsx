import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { AmenDarkDecorator, AmenLightDecorator } from "../storybook-utils";
import { DrawingIcon } from "./DrawingIcon";

const meta: Meta<typeof DrawingIcon> = {
	title: "Amen/Animation/DrawingIcon",
	component: DrawingIcon,
	tags: ["autodocs"],
	argTypes: {
		path: { control: "text" },
		viewBox: { control: "text" },
		size: { control: { type: "range", min: 12, max: 128, step: 4 } },
		strokeColor: { control: "color" },
		strokeWidth: { control: { type: "range", min: 0.5, max: 5, step: 0.5 } },
		duration: { control: { type: "range", min: 500, max: 5000, step: 100 } },
		delay: { control: { type: "range", min: 0, max: 2000, step: 100 } },
		fillColor: { control: "color" },
		enabled: { control: "boolean" },
	},
	decorators: [AmenLightDecorator],
};

export default meta;

type Story = StoryObj<typeof DrawingIcon>;

const CROSS_PATH = "M12 2v20M2 12h20";
const STAR_PATH =
	"M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z";

export const Default: Story = {
	args: {
		path: CROSS_PATH,
		viewBox: "0 0 24 24",
		size: 48,
		strokeColor: "#C9A84C",
		strokeWidth: 2,
		duration: 1500,
		delay: 0,
		fillColor: "none",
		enabled: true,
	},
};

export const Filled: Story = {
	args: {
		path: STAR_PATH,
		viewBox: "0 0 24 24",
		size: 64,
		strokeColor: "#FFD700",
		strokeWidth: 1.5,
		duration: 2000,
		delay: 0,
		fillColor: "#FFD700",
		enabled: true,
	},
};

export const OnDark: Story = {
	args: {
		path: CROSS_PATH,
		viewBox: "0 0 24 24",
		size: 48,
		strokeColor: "#FFD700",
		strokeWidth: 2,
		duration: 1500,
		delay: 0,
		fillColor: "none",
		enabled: true,
	},
	decorators: [AmenDarkDecorator],
};
