import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Text, View } from "react-native";
import {
	FloatingElement,
	GlowIcon,
	ShimmerSurface,
	SparkleWrapper,
} from "../animation";
import { AmenIcon } from "../icons";
import { AmenDarkDecorator, AmenLightDecorator } from "../storybook-utils";

const meta: Meta = {
	title: "Amen/Composition/LoadingScreen",
	tags: ["autodocs"],
	decorators: [AmenLightDecorator],
};

export default meta;
type Story = StoryObj;

const LoadingContent = ({
	withVerse = false,
	isDark = false,
}: {
	withVerse?: boolean;
	isDark?: boolean;
}) => {
	const textColor = isDark ? "#FFFDF7" : "#373028";
	const goldColor = "#C9A84C";

	return (
		<View
			style={{
				flex: 1,
				alignItems: "center",
				justifyContent: "center",
				gap: 48,
				width: "100%",
				height: "100%",
				minHeight: 400,
			}}
		>
			<FloatingElement amplitude={12} duration={4000}>
				<SparkleWrapper count={12} color={goldColor}>
					<GlowIcon color={goldColor} intensity={1.5} speed={3000}>
						<AmenIcon name="cross" size={80} color={goldColor} />
					</GlowIcon>
				</SparkleWrapper>
			</FloatingElement>

			<View style={{ width: 240, gap: 16, alignItems: "center" }}>
				<Text
					style={{
						fontSize: 18,
						color: goldColor,
						fontWeight: "600",
						letterSpacing: 2,
						textTransform: "uppercase",
					}}
				>
					Loading...
				</Text>

				<ShimmerSurface
					width="100%"
					height={4}
					borderRadius={2}
					baseColor={
						isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"
					}
					shimmerColor={goldColor}
					speed={1500}
				/>

				{withVerse && (
					<Text
						style={{
							fontSize: 14,
							color: textColor,
							opacity: 0.7,
							textAlign: "center",
							fontStyle: "italic",
							marginTop: 16,
							maxWidth: 200,
							lineHeight: 20,
						}}
					>
						"Be still, and know that I am God."
						{"\n"}
						<Text style={{ fontSize: 12, opacity: 0.5 }}>Psalm 46:10</Text>
					</Text>
				)}
			</View>
		</View>
	);
};

export const Default: Story = {
	render: () => <LoadingContent />,
};

export const WithVerse: Story = {
	render: () => <LoadingContent withVerse />,
};

export const OnDark: Story = {
	decorators: [AmenDarkDecorator],
	render: () => <LoadingContent withVerse isDark />,
};
