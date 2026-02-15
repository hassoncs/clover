import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { View } from "react-native";
import { KnobSlider } from "./KnobSlider";

const meta: Meta<typeof KnobSlider> = {
	title: "Knobs/Slider",
	component: KnobSlider,
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

const InteractiveSlider = (args: any) => {
	const [value, setValue] = useState(args.value);
	return (
		<KnobSlider
			{...args}
			value={value}
			onChange={(v) => {
				setValue(v);
				args.onChange?.(v);
			}}
		/>
	);
};

export const Default: Story = {
	render: InteractiveSlider,
	args: {
		label: "Gravity",
		value: 50,
		min: 0,
		max: 100,
	},
};

export const WideRange: Story = {
	render: InteractiveSlider,
	args: {
		label: "Frequency",
		value: 500,
		min: 0,
		max: 1000,
	},
};

export const FineControl: Story = {
	render: InteractiveSlider,
	args: {
		label: "Opacity",
		value: 0.5,
		min: 0,
		max: 1,
		step: 0.001,
	},
};

export const Integer: Story = {
	render: InteractiveSlider,
	args: {
		label: "Count",
		value: 5,
		min: 0,
		max: 10,
		step: 1,
	},
};

export const WithDescription: Story = {
	render: InteractiveSlider,
	args: {
		label: "Gravity",
		description: "Controls the downward force applied to physics bodies",
		value: 9.8,
		min: 0,
		max: 20,
		step: 0.1,
	},
};
