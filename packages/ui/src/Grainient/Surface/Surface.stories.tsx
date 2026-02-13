import type { Meta, StoryObj } from "@storybook/react";
import { Text, View } from "react-native";
import { Surface } from "./Surface";

const meta: Meta<typeof Surface> = {
	title: "Grainient/Surface",
	component: Surface,
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["grainient", "glass", "solid"],
		},
		palette: {
			control: "select",
			options: ["ultraviolet", "ember", "abyss"],
		},
		radius: {
			control: "select",
			options: ["none", "sm", "md", "lg", "xl", "2xl", "full"],
		},
		padding: {
			control: "select",
			options: [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16],
		},
		disableGrain: {
			control: "boolean",
		},
	},
	args: {
		variant: "grainient",
		palette: "ultraviolet",
		radius: "md",
		padding: 4,
		children: (
			<View>
				<Text style={{ color: "white", fontWeight: "bold" }}>
					Surface Content
				</Text>
				<Text style={{ color: "rgba(255,255,255,0.8)" }}>
					This is a sample text inside the surface.
				</Text>
			</View>
		),
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllVariants: Story = {
	render: (args) => (
		<View style={{ gap: 16, padding: 20 }}>
			<Surface {...args} variant="grainient">
				<Text style={{ color: "white", fontWeight: "bold" }}>
					Grainient Variant
				</Text>
				<Text style={{ color: "rgba(255,255,255,0.8)" }}>
					Full gradient background with grain
				</Text>
			</Surface>

			<Surface {...args} variant="glass">
				<Text style={{ color: "black", fontWeight: "bold" }}>
					Glass Variant
				</Text>
				<Text style={{ color: "rgba(0,0,0,0.6)" }}>
					Semi-transparent background with grain
				</Text>
			</Surface>

			<Surface {...args} variant="solid">
				<Text style={{ color: "black", fontWeight: "bold" }}>
					Solid Variant
				</Text>
				<Text style={{ color: "rgba(0,0,0,0.6)" }}>
					Solid background with subtle grain
				</Text>
			</Surface>
		</View>
	),
};

export const PaletteShowcase: Story = {
	render: (args) => (
		<View style={{ gap: 16, padding: 20 }}>
			<Surface {...args} palette="ultraviolet" variant="grainient">
				<Text style={{ color: "white", fontWeight: "bold" }}>Ultraviolet</Text>
			</Surface>
			<Surface {...args} palette="ember" variant="grainient">
				<Text style={{ color: "white", fontWeight: "bold" }}>Ember</Text>
			</Surface>
			<Surface {...args} palette="abyss" variant="grainient">
				<Text style={{ color: "white", fontWeight: "bold" }}>Abyss</Text>
			</Surface>
		</View>
	),
};

export const DarkMode: Story = {
	parameters: {
		backgrounds: { default: "dark" },
	},
	render: (args) => (
		<View style={{ gap: 16, padding: 20, backgroundColor: "#000" }}>
			<Surface {...args} variant="grainient">
				<Text style={{ color: "white", fontWeight: "bold" }}>Grainient</Text>
			</Surface>
			<Surface {...args} variant="glass">
				<Text style={{ color: "white", fontWeight: "bold" }}>Glass</Text>
				<Text style={{ color: "rgba(255,255,255,0.7)" }}>
					Adapts to dark mode
				</Text>
			</Surface>
			<Surface {...args} variant="solid">
				<Text style={{ color: "white", fontWeight: "bold" }}>Solid</Text>
				<Text style={{ color: "rgba(255,255,255,0.7)" }}>
					Adapts to dark mode
				</Text>
			</Surface>
		</View>
	),
};
