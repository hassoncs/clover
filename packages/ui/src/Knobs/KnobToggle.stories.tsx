import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { View } from "react-native";
import { KnobToggle } from "./KnobToggle";

const meta: Meta<typeof KnobToggle> = {
	title: "UI/Knobs/KnobToggle",
	component: KnobToggle,
	decorators: [
		(Story) => (
			<View className="p-4 bg-black flex-1">
				<Story />
			</View>
		),
	],
	argTypes: {
		onChange: { action: "onChange" },
	},
};

export default meta;

type Story = StoryObj<typeof KnobToggle>;

export const DefaultOn: Story = {
	args: {
		label: "Auto Spawn",
		value: true,
	},
	render: (args) => {
		const [value, setValue] = useState(args.value);
		return <KnobToggle {...args} value={value} onChange={setValue} />;
	},
};

export const DefaultOff: Story = {
	args: {
		label: "Sound Effects",
		value: false,
	},
	render: (args) => {
		const [value, setValue] = useState(args.value);
		return <KnobToggle {...args} value={value} onChange={setValue} />;
	},
};

export const WithDescription: Story = {
	args: {
		label: "Debug Mode",
		description: "Show collision boxes and physics debug info",
		value: true,
	},
	render: (args) => {
		const [value, setValue] = useState(args.value);
		return <KnobToggle {...args} value={value} onChange={setValue} />;
	},
};

export const Disabled: Story = {
	args: {
		label: "Pro Features",
		description: "Upgrade to unlock this feature",
		value: false,
		disabled: true,
	},
	render: (args) => {
		const [value, setValue] = useState(args.value);
		return <KnobToggle {...args} value={value} onChange={setValue} />;
	},
};
