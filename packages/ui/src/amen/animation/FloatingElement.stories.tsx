import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { AmenIcon } from "../icons/AmenIcon";
import { AmenLightDecorator } from "../storybook-utils";
import { FloatingElement } from "./FloatingElement";

const meta: Meta<typeof FloatingElement> = {
	title: "Amen/Animation/FloatingElement",
	component: FloatingElement,
	tags: ["autodocs"],
	argTypes: {
		amplitude: { control: { type: "range", min: 0, max: 20, step: 1 } },
		duration: { control: { type: "range", min: 500, max: 5000, step: 100 } },
		enabled: { control: "boolean" },
	},
	decorators: [AmenLightDecorator],
};

export default meta;

type Story = StoryObj<typeof FloatingElement>;

export const Default: Story = {
	args: {
		amplitude: 6,
		duration: 3000,
		enabled: true,
	},
	render: (args) => (
		<FloatingElement {...args}>
			<AmenIcon name="dove" size={48} color="#C9A84C" />
		</FloatingElement>
	),
};

export const Subtle: Story = {
	args: {
		amplitude: 3,
		duration: 4000,
		enabled: true,
	},
	render: (args) => (
		<FloatingElement {...args}>
			<AmenIcon name="cross" size={48} color="#C9A84C" />
		</FloatingElement>
	),
};

export const Strong: Story = {
	args: {
		amplitude: 12,
		duration: 2000,
		enabled: true,
	},
	render: (args) => (
		<FloatingElement {...args}>
			<AmenIcon name="angelWings" size={48} color="#C9A84C" />
		</FloatingElement>
	),
};
