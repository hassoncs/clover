import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Text, View } from "react-native";

const meta: Meta = {
	title: "Amen/Theme/ColorPalette",
	tags: ["autodocs"],
};

export default meta;

function ColorSwatch({
	name,
	hex,
	cssVar,
	twClass,
}: {
	name: string;
	hex: string;
	cssVar: string;
	twClass: string;
}) {
	return (
		<View
			style={{
				flexDirection: "row",
				alignItems: "center",
				marginBottom: 8,
			}}
		>
			<View
				style={{
					width: 48,
					height: 48,
					backgroundColor: hex,
					borderRadius: 8,
					borderWidth: 1,
					borderColor: "#E5E7EB",
				}}
			/>
			<View style={{ marginLeft: 12 }}>
				<Text style={{ fontWeight: "600" }}>{name}</Text>
				<Text style={{ fontSize: 12, color: "#6B7280" }}>
					{hex} · {cssVar} · {twClass}
				</Text>
			</View>
		</View>
	);
}

export const AllColors: StoryObj = {
	render: () => (
		<View style={{ padding: 24 }}>
			<Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
				Amen Color Palette
			</Text>
			<ColorSwatch
				name="Primary Gold"
				hex="#C9A84C"
				cssVar="--color-theme-primary"
				twClass="text-theme-primary"
			/>
			<ColorSwatch
				name="Secondary Navy"
				hex="#1B3A6B"
				cssVar="--color-theme-secondary"
				twClass="text-theme-secondary"
			/>
			<ColorSwatch
				name="Glow Gold"
				hex="#FFD700"
				cssVar="--color-theme-glow"
				twClass="text-theme-glow"
			/>
			<ColorSwatch
				name="Warm White"
				hex="#FFFDF7"
				cssVar="--color-theme-background"
				twClass="bg-theme-background"
			/>
			<ColorSwatch
				name="Soft Yellow"
				hex="#FFF1BA"
				cssVar="--color-theme-surface-elevated"
				twClass="bg-theme-surface-elevated"
			/>
			<ColorSwatch
				name="Golden Accent"
				hex="#DAA520"
				cssVar="--color-theme-accent"
				twClass="text-theme-accent"
			/>
			<ColorSwatch
				name="Background"
				hex="#FFFDF7"
				cssVar="--color-theme-background"
				twClass="bg-theme-background"
			/>
			<ColorSwatch
				name="Surface"
				hex="#FFFFFF"
				cssVar="--color-theme-surface"
				twClass="bg-theme-surface"
			/>
			<ColorSwatch
				name="Surface Elevated"
				hex="#FDF8EB"
				cssVar="--color-theme-surface-elevated"
				twClass="bg-theme-surface-elevated"
			/>
			<ColorSwatch
				name="Border"
				hex="#F0E6CD"
				cssVar="--color-theme-border"
				twClass="border-theme-border"
			/>
			<ColorSwatch
				name="Text"
				hex="#373028"
				cssVar="--color-theme-text"
				twClass="text-theme-text"
			/>
			<ColorSwatch
				name="Text Secondary"
				hex="#8C8069"
				cssVar="--color-theme-text-secondary"
				twClass="text-theme-text-secondary"
			/>
		</View>
	),
};
