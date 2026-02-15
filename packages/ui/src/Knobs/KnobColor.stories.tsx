import type { Meta, StoryObj } from "@storybook/react";
import { View } from "react-native";
import { KnobColor } from "./KnobColor";

const meta: Meta<typeof KnobColor> = {
	title: "UI/Knobs/Color",
	component: KnobColor,
	decorators: [
		(Story) => (
			<View style={{ padding: 16, backgroundColor: "#111827", flex: 1 }}>
				<Story />
			</View>
		),
	],
	argTypes: {
		onChange: { action: "onChange" },
	},
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		label: "Ball Color",
		value: "#EF4444",
		description: "Select the color of the ball",
		onChange: () => {},
	},
};

export const CustomOnly: Story = {
	args: {
		label: "Custom Color",
		value: "#FF00FF",
		presets: [],
		onChange: () => {},
	},
};

export const ManyPresets: Story = {
	args: {
		label: "Palette",
		value: "#3B82F6",
		presets: [
			"#EF4444",
			"#F97316",
			"#EAB308",
			"#22C55E",
			"#3B82F6",
			"#8B5CF6",
			"#EC4899",
			"#6B7280",
			"#1F2937",
			"#374151",
			"#4B5563",
			"#9CA3AF",
			"#D1D5DB",
			"#E5E7EB",
			"#F3F4F6",
			"#FFFFFF",
		],
		onChange: () => {},
	},
};

export const Disabled: Story = {
	args: {
		label: "Disabled",
		value: "#22C55E",
		disabled: true,
		onChange: () => {},
	},
};
