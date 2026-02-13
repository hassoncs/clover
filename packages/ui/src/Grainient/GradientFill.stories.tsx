import { grainient } from "@slopcade/theme";
import type { Meta, StoryObj } from "@storybook/react";
import { View } from "react-native";
import { GradientFill } from "./index";

const meta: Meta<typeof GradientFill> = {
	title: "Grainient/GradientFill",
	component: GradientFill,
	argTypes: {
		colors: { control: "object" },
		blurRadius: { control: "number" },
	},
};

export default meta;

type Story = StoryObj<typeof GradientFill>;

export const Ultraviolet: Story = {
	args: {
		colors: grainient.palettes.ultraviolet.gradient,
		style: { width: 300, height: 300, borderRadius: 16 },
	},
};

export const Ember: Story = {
	args: {
		colors: grainient.palettes.ember.gradient,
		style: { width: 300, height: 300, borderRadius: 16 },
	},
};

export const Abyss: Story = {
	args: {
		colors: grainient.palettes.abyss.gradient,
		style: { width: 300, height: 300, borderRadius: 16 },
	},
};

export const AllPalettes: Story = {
	render: () => (
		<View
			style={{
				flexDirection: "row",
				gap: 16,
				padding: 16,
				backgroundColor: "#111",
				flexWrap: "wrap",
			}}
		>
			<GradientFill
				colors={grainient.palettes.ultraviolet.gradient}
				style={{ width: 200, height: 200, borderRadius: 16 }}
			/>
			<GradientFill
				colors={grainient.palettes.ember.gradient}
				style={{ width: 200, height: 200, borderRadius: 16 }}
			/>
			<GradientFill
				colors={grainient.palettes.abyss.gradient}
				style={{ width: 200, height: 200, borderRadius: 16 }}
			/>
		</View>
	),
};
