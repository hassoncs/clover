import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { View } from "react-native";
import { GrainientButton } from "./GrainientButton";

const meta: Meta<typeof GrainientButton> = {
	title: "Grainient/Button",
	component: GrainientButton,
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["grainient", "glass", "solid", "outline", "ghost"],
		},
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
		},
		palette: {
			control: "select",
			options: ["ultraviolet", "ember", "abyss"],
		},
		loading: {
			control: "boolean",
		},
		disabled: {
			control: "boolean",
		},
	},
	args: {
		label: "Button",
		variant: "grainient",
		size: "md",
		palette: "ultraviolet",
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllVariants: Story = {
	render: (args) => (
		<View style={{ gap: 16, padding: 20, alignItems: "flex-start" }}>
			<GrainientButton {...args} variant="grainient" label="Grainient" />
			<GrainientButton {...args} variant="glass" label="Glass" />
			<GrainientButton {...args} variant="solid" label="Solid" />
			<GrainientButton {...args} variant="outline" label="Outline" />
			<GrainientButton {...args} variant="ghost" label="Ghost" />
		</View>
	),
};

export const AllSizes: Story = {
	render: (args) => (
		<View
			style={{
				flexDirection: "row",
				gap: 16,
				padding: 20,
				alignItems: "center",
			}}
		>
			<GrainientButton {...args} size="sm" label="Small" />
			<GrainientButton {...args} size="md" label="Medium" />
			<GrainientButton {...args} size="lg" label="Large" />
		</View>
	),
};

export const PaletteShowcase: Story = {
	render: (args) => (
		<View style={{ gap: 16, padding: 20, alignItems: "flex-start" }}>
			<GrainientButton
				{...args}
				palette="ultraviolet"
				label="Ultraviolet"
				variant="grainient"
			/>
			<GrainientButton
				{...args}
				palette="ember"
				label="Ember"
				variant="grainient"
			/>
			<GrainientButton
				{...args}
				palette="abyss"
				label="Abyss"
				variant="grainient"
			/>
		</View>
	),
};

export const DarkMode: Story = {
	parameters: {
		backgrounds: { default: "dark" },
	},
	render: (args) => (
		<View
			style={{
				gap: 16,
				padding: 20,
				backgroundColor: "#000",
				alignItems: "flex-start",
			}}
		>
			<GrainientButton {...args} variant="grainient" label="Grainient" />
			<GrainientButton {...args} variant="glass" label="Glass" />
			<GrainientButton {...args} variant="solid" label="Solid" />
			<GrainientButton {...args} variant="outline" label="Outline" />
			<GrainientButton {...args} variant="ghost" label="Ghost" />
		</View>
	),
};

export const WithLoading: Story = {
	args: {
		loading: true,
		label: "Loading",
	},
};
