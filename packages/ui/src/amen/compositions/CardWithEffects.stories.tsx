import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Text, View } from "react-native";
import {
	AmenGrainOverlay,
	GlowIcon,
	ShimmerSurface,
	SparkleWrapper,
} from "../animation";
import { MotifDivider } from "../decor";
import { AmenIcon } from "../icons";
import { AmenDarkDecorator, AmenLightDecorator } from "../storybook-utils";

const meta: Meta = {
	title: "Amen/Composition/CardWithEffects",
	tags: ["autodocs"],
	decorators: [AmenLightDecorator],
};

export default meta;
type Story = StoryObj;

const CardContent = ({
	withSparkles = false,
	isDark = false,
}: {
	withSparkles?: boolean;
	isDark?: boolean;
}) => {
	const textColor = isDark ? "#FFFDF7" : "#373028";
	const goldColor = "#C9A84C";

	const IconComponent = (
		<GlowIcon color={goldColor} intensity={1.2}>
			<AmenIcon name="cross" size={48} color={goldColor} />
		</GlowIcon>
	);

	return (
		<ShimmerSurface
			width={300}
			height={400}
			baseColor={isDark ? "#1A2639" : "#FFFDF7"}
			shimmerColor={
				isDark ? "rgba(201, 168, 76, 0.1)" : "rgba(255, 215, 0, 0.15)"
			}
			style={{
				shadowColor: "#000",
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.1,
				shadowRadius: 12,
				elevation: 5,
			}}
		>
			<AmenGrainOverlay intensity={0.15} tint={goldColor} />
			<View
				style={{
					flex: 1,
					padding: 24,
					alignItems: "center",
					justifyContent: "center",
					gap: 24,
				}}
			>
				{withSparkles ? (
					<SparkleWrapper count={8} color={goldColor}>
						{IconComponent}
					</SparkleWrapper>
				) : (
					IconComponent
				)}

				<View style={{ alignItems: "center", gap: 8 }}>
					<Text
						style={{
							fontSize: 24,
							fontWeight: "bold",
							color: goldColor,
							fontFamily: "serif",
							textAlign: "center",
						}}
					>
						Daily Prayer
					</Text>
					<Text
						style={{
							fontSize: 14,
							color: textColor,
							opacity: 0.8,
							textAlign: "center",
							lineHeight: 20,
						}}
					>
						Begin your day with grace and gratitude.
					</Text>
				</View>

				<MotifDivider icon="dove" size="sm" />

				<Text
					style={{
						fontSize: 12,
						color: textColor,
						opacity: 0.6,
						fontStyle: "italic",
					}}
				>
					Matthew 6:9-13
				</Text>
			</View>
		</ShimmerSurface>
	);
};

export const Default: Story = {
	render: () => <CardContent />,
};

export const WithSparkles: Story = {
	render: () => <CardContent withSparkles />,
};

export const OnDark: Story = {
	decorators: [AmenDarkDecorator],
	render: () => <CardContent isDark />,
};
