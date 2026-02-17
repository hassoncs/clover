import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Text, View } from "react-native";
import { FloatingElement, ShimmerSurface, SparkleWrapper } from "../animation";
import { MotifDivider } from "../decor";
import { AmenIcon } from "../icons";
import { AmenDarkDecorator, AmenLightDecorator } from "../storybook-utils";

const meta: Meta = {
	title: "Amen/Composition/EmptyState",
	tags: ["autodocs"],
	decorators: [AmenLightDecorator],
};

export default meta;
type Story = StoryObj;

const EmptyStateContent = ({
	withSparkles = false,
	isDark = false,
}: {
	withSparkles?: boolean;
	isDark?: boolean;
}) => {
	const textColor = isDark ? "#FFFDF7" : "#373028";
	const goldColor = "#C9A84C";

	const IconComponent = (
		<AmenIcon name="dove" size={64} color={goldColor} glow />
	);

	return (
		<View
			style={{
				flex: 1,
				alignItems: "center",
				justifyContent: "center",
				gap: 32,
				padding: 32,
				maxWidth: 400,
			}}
		>
			<FloatingElement amplitude={8} duration={3000}>
				{withSparkles ? (
					<SparkleWrapper count={6} color={goldColor}>
						{IconComponent}
					</SparkleWrapper>
				) : (
					IconComponent
				)}
			</FloatingElement>

			<View style={{ alignItems: "center", gap: 12 }}>
				<Text
					style={{
						fontSize: 24,
						fontWeight: "bold",
						color: goldColor,
						fontFamily: "serif",
						textAlign: "center",
					}}
				>
					No Games Yet
				</Text>
				<Text
					style={{
						fontSize: 16,
						color: textColor,
						opacity: 0.7,
						textAlign: "center",
						lineHeight: 24,
					}}
				>
					Your library is empty. Create your first game to begin your journey.
				</Text>
			</View>

			<MotifDivider icon="oliveBranch" size="sm" />

			<ShimmerSurface
				width={200}
				height={48}
				borderRadius={24}
				baseColor={goldColor}
				shimmerColor="rgba(255, 255, 255, 0.4)"
				speed={2000}
				style={{
					shadowColor: goldColor,
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: 0.3,
					shadowRadius: 8,
					elevation: 4,
				}}
			>
				<View
					style={{
						flex: 1,
						alignItems: "center",
						justifyContent: "center",
						flexDirection: "row",
						gap: 8,
					}}
				>
					<AmenIcon name="star" size={20} color="#FFFDF7" />
					<Text
						style={{
							color: "#FFFDF7",
							fontWeight: "bold",
							fontSize: 16,
							letterSpacing: 0.5,
						}}
					>
						Create Game
					</Text>
				</View>
			</ShimmerSurface>
		</View>
	);
};

export const Default: Story = {
	render: () => <EmptyStateContent />,
};

export const WithSparkles: Story = {
	render: () => <EmptyStateContent withSparkles />,
};

export const OnDark: Story = {
	decorators: [AmenDarkDecorator],
	render: () => <EmptyStateContent withSparkles isDark />,
};
