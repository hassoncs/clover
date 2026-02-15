import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { View } from "react-native";
import { KnobSelect } from "./KnobSelect";

const meta: Meta<typeof KnobSelect> = {
	title: "Knobs/Select",
	component: KnobSelect,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<View style={{ padding: 20, backgroundColor: "#111827", flex: 1 }}>
				<Story />
			</View>
		),
	],
	argTypes: {
		onChange: { action: "changed" },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

const InteractiveSelect = (args: any) => {
	const [value, setValue] = useState(args.value);
	return (
		<KnobSelect
			{...args}
			value={value}
			onChange={(v) => {
				setValue(v);
				args.onChange?.(v);
			}}
		/>
	);
};

export const TwoOptions: Story = {
	render: InteractiveSelect,
	args: {
		label: "Alignment",
		value: "left",
		options: [
			{ label: "Left", value: "left" },
			{ label: "Right", value: "right" },
		],
	},
};

export const ThreeOptions: Story = {
	render: InteractiveSelect,
	args: {
		label: "Shape",
		value: "box",
		options: [
			{ label: "Sphere", value: "sphere" },
			{ label: "Box", value: "box" },
			{ label: "Cylinder", value: "cylinder" },
		],
	},
};

export const ManyOptions: Story = {
	render: InteractiveSelect,
	args: {
		label: "Category",
		value: "action",
		options: [
			{ label: "Action", value: "action" },
			{ label: "Adventure", value: "adventure" },
			{ label: "Puzzle", value: "puzzle" },
			{ label: "Strategy", value: "strategy" },
			{ label: "RPG", value: "rpg" },
			{ label: "Simulation", value: "simulation" },
			{ label: "Sports", value: "sports" },
		],
	},
};

export const WithIcons: Story = {
	render: InteractiveSelect,
	args: {
		label: "Weather",
		value: "sunny",
		options: [
			{ label: "Sunny", value: "sunny", icon: "☀️" },
			{ label: "Cloudy", value: "cloudy", icon: "☁️" },
			{ label: "Rainy", value: "rainy", icon: "🌧️" },
		],
	},
};

export const Disabled: Story = {
	render: InteractiveSelect,
	args: {
		label: "Difficulty",
		value: "medium",
		disabled: true,
		options: [
			{ label: "Easy", value: "easy" },
			{ label: "Medium", value: "medium" },
			{ label: "Hard", value: "hard" },
		],
	},
};
