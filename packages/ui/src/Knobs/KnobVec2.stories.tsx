import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { View } from "react-native";
import { KnobVec2 } from "./KnobVec2";

const meta: Meta<typeof KnobVec2> = {
	title: "Knobs/KnobVec2",
	component: KnobVec2,
	decorators: [
		(Story) => (
			<View style={{ padding: 20, backgroundColor: "#111827", flex: 1 }}>
				<Story />
			</View>
		),
	],
};

export default meta;

type Story = StoryObj<typeof KnobVec2>;

export const Default: Story = {
	render: (args) => {
		const [value, setValue] = useState({ x: 0, y: 0 });
		return <KnobVec2 {...args} value={value} onChange={setValue} />;
	},
	args: {
		label: "Wind Direction",
		min: { x: -1, y: -1 },
		max: { x: 1, y: 1 },
	},
};

export const Position: Story = {
	render: (args) => {
		const [value, setValue] = useState({ x: 50, y: 50 });
		return <KnobVec2 {...args} value={value} onChange={setValue} />;
	},
	args: {
		label: "Position",
		min: { x: 0, y: 0 },
		max: { x: 100, y: 100 },
	},
};

export const WithDescription: Story = {
	render: (args) => {
		const [value, setValue] = useState({ x: 0.5, y: -0.5 });
		return <KnobVec2 {...args} value={value} onChange={setValue} />;
	},
	args: {
		label: "Force Vector",
		description: "Adjust the force direction and magnitude",
		min: { x: -1, y: -1 },
		max: { x: 1, y: 1 },
	},
};
