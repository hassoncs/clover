import type { Meta, StoryObj } from "@storybook/react";
import { View } from "react-native";
import { KnobButton } from "./KnobButton";

const meta: Meta<typeof KnobButton> = {
	title: "Knobs/Button",
	component: KnobButton,
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<View style={{ padding: 20, backgroundColor: "#111827", flex: 1 }}>
				<Story />
			</View>
		),
	],
	argTypes: {
		onAction: { action: "action" },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		label: "Reset Scene",
		action: "reset",
		variant: "default",
	},
};

export const Destructive: Story = {
	args: {
		label: "Delete Entity",
		action: "delete",
		variant: "destructive",
	},
};

export const WithEmoji: Story = {
	args: {
		label: "🚀 Launch",
		action: "launch",
		variant: "default",
	},
};

export const Disabled: Story = {
	args: {
		label: "Cannot Click",
		action: "noop",
		variant: "default",
		disabled: true,
	},
};
