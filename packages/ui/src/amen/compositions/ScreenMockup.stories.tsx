import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { AmenGrainOverlay, ShimmerSurface } from "../animation";
import {
	HaloBadge,
	MotifDivider,
	PatternBackground,
	SectionOrnament,
} from "../decor";
import { AmenIcon } from "../icons";
import { AmenDarkDecorator, AmenLightDecorator } from "../storybook-utils";

const meta: Meta = {
	title: "Amen/Composition/ScreenMockup",
	tags: ["autodocs"],
	decorators: [AmenLightDecorator],
};

export default meta;
type Story = StoryObj;

const ScreenContent = ({ isDark = false }: { isDark?: boolean }) => {
	const textColor = isDark ? "#FFFDF7" : "#373028";
	const goldColor = "#C9A84C";
	const bgColor = isDark ? "#0D1C33" : "#FFFDF7";
	const cardBg = isDark ? "#1A2639" : "#FFFFFF";

	const GameCard = ({
		title,
		icon,
		delay = 0,
	}: {
		title: string;
		icon: any;
		delay?: number;
	}) => (
		<ShimmerSurface
			width="100%"
			height={120}
			borderRadius={16}
			baseColor={cardBg}
			shimmerColor={
				isDark ? "rgba(201, 168, 76, 0.1)" : "rgba(255, 215, 0, 0.1)"
			}
			speed={3000}
			style={{
				marginBottom: 16,
				shadowColor: "#000",
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.05,
				shadowRadius: 8,
				elevation: 2,
			}}
		>
			<View
				style={{
					flex: 1,
					flexDirection: "row",
					alignItems: "center",
					padding: 16,
					gap: 16,
				}}
			>
				<HaloBadge
					size={64}
					haloColor={goldColor}
					backgroundColor={isDark ? "#0D1C33" : "#FFFDF7"}
					glowing
				>
					<AmenIcon name={icon} size={32} color={goldColor} />
				</HaloBadge>
				<View style={{ flex: 1, gap: 4 }}>
					<Text
						style={{
							fontSize: 18,
							fontWeight: "bold",
							color: textColor,
							fontFamily: "serif",
						}}
					>
						{title}
					</Text>
					<Text style={{ fontSize: 14, color: textColor, opacity: 0.6 }}>
						Tap to play
					</Text>
				</View>
				<AmenIcon name="star" size={20} color={goldColor} />
			</View>
		</ShimmerSurface>
	);

	return (
		<View
			style={{
				width: 375,
				height: 812,
				backgroundColor: bgColor,
				overflow: "hidden",
				borderRadius: 40,
				borderWidth: 8,
				borderColor: isDark ? "#2A3B55" : "#E5E5E5",
			}}
		>
			<PatternBackground
				pattern="crosses"
				color={
					isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(201, 168, 76, 0.05)"
				}
				spacing={40}
				style={{ flex: 1 }}
			>
				<AmenGrainOverlay intensity={0.05} tint={goldColor} />

				<ScrollView
					contentContainerStyle={{ padding: 24, paddingTop: 60, gap: 32 }}
					showsVerticalScrollIndicator={false}
				>
					<View style={{ alignItems: "center", gap: 16 }}>
						<SectionOrnament variant="wheat" size="lg" color={goldColor} />
						<Text
							style={{
								fontSize: 32,
								fontWeight: "bold",
								color: goldColor,
								fontFamily: "serif",
								textAlign: "center",
							}}
						>
							Sanctuary
						</Text>
						<Text
							style={{
								fontSize: 16,
								color: textColor,
								opacity: 0.8,
								textAlign: "center",
								lineHeight: 24,
							}}
						>
							Peace be with you.
						</Text>
					</View>

					<MotifDivider icon="dove" size="sm" />

					<View>
						<Text
							style={{
								fontSize: 14,
								fontWeight: "600",
								color: goldColor,
								letterSpacing: 1,
								marginBottom: 16,
								textTransform: "uppercase",
							}}
						>
							Featured Games
						</Text>
						<GameCard title="Bible Trivia" icon="bible" />
						<GameCard title="Daily Word" icon="scroll" delay={100} />
						<GameCard title="Prayer Circle" icon="prayingHands" delay={200} />
					</View>

					<SectionOrnament variant="olive" size="md" color={goldColor} />

					<View
						style={{
							padding: 24,
							backgroundColor: isDark
								? "rgba(255, 255, 255, 0.05)"
								: "rgba(201, 168, 76, 0.1)",
							borderRadius: 16,
							alignItems: "center",
							gap: 12,
						}}
					>
						<AmenIcon name="church" size={40} color={goldColor} />
						<Text
							style={{
								fontSize: 18,
								fontWeight: "bold",
								color: textColor,
								textAlign: "center",
							}}
						>
							Join Community
						</Text>
						<Text
							style={{
								fontSize: 14,
								color: textColor,
								opacity: 0.7,
								textAlign: "center",
							}}
						>
							Connect with others in faith and fellowship.
						</Text>
					</View>

					<View style={{ height: 40 }} />
				</ScrollView>
			</PatternBackground>
		</View>
	);
};

export const Default: Story = {
	render: () => <ScreenContent />,
};

export const OnDark: Story = {
	decorators: [AmenDarkDecorator],
	render: () => <ScreenContent isDark />,
};
