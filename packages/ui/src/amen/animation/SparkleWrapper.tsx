import React, { type ReactNode, useEffect, useMemo, useState } from "react";
import {
	type LayoutChangeEvent,
	type StyleProp,
	StyleSheet,
	Text,
	View,
	type ViewStyle,
} from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withRepeat,
	withSequence,
	withTiming,
} from "react-native-reanimated";

interface SparkleWrapperProps {
	children: ReactNode;
	count?: number;
	color?: string;
	enabled?: boolean;
	style?: StyleProp<ViewStyle>;
}

interface SparklePoint {
	id: number;
	x: number;
	y: number;
	size: number;
	delay: number;
}

interface SparkleProps {
	x: number;
	y: number;
	size: number;
	color: string;
	delay: number;
	enabled: boolean;
}

function Sparkle({ x, y, size, color, delay, enabled }: SparkleProps) {
	const pulse = useSharedValue(enabled ? 0 : 0);

	useEffect(() => {
		if (!enabled) {
			cancelAnimation(pulse);
			pulse.value = withTiming(0, { duration: 120 });
			return;
		}

		pulse.value = 0;
		pulse.value = withDelay(
			delay,
			withRepeat(
				withSequence(
					withTiming(1, {
						duration: 550,
						easing: Easing.out(Easing.quad),
					}),
					withTiming(0, {
						duration: 1450,
						easing: Easing.in(Easing.quad),
					}),
				),
				-1,
				false,
			),
		);

		return () => {
			cancelAnimation(pulse);
		};
	}, [delay, enabled, pulse]);

	const animatedStyle = useAnimatedStyle(() => ({
		opacity: pulse.value,
		transform: [{ scale: 0.5 + pulse.value * 0.5 }],
	}));

	return (
		<Animated.View
			style={[
				styles.sparkle,
				{
					left: x - size / 2,
					top: y - size / 2,
					width: size,
					height: size,
				},
				animatedStyle,
			]}
		>
			<Text
				style={[
					styles.sparkleGlyph,
					{ fontSize: size, lineHeight: size, color },
				]}
			>
				✦
			</Text>
		</Animated.View>
	);
}

export function SparkleWrapper({
	children,
	count = 6,
	color = "#FFD700",
	enabled = true,
	style,
}: SparkleWrapperProps) {
	const [layout, setLayout] = useState({ width: 0, height: 0 });
	const sparkleCount = Math.min(count, 12);

	const sparklePoints = useMemo<SparklePoint[]>(() => {
		if (sparkleCount <= 0 || layout.width <= 0 || layout.height <= 0) {
			return [];
		}

		const centerX = layout.width / 2;
		const centerY = layout.height / 2;
		const baseRadius = Math.min(layout.width, layout.height) * 0.32;

		return Array.from({ length: sparkleCount }, (_, i) => {
			const angle = (i / sparkleCount) * Math.PI * 2;
			const radius = baseRadius + (i % 2) * 12;
			const size = 8 + (i % 3) * 4;

			return {
				id: i,
				x: centerX + Math.cos(angle) * radius,
				y: centerY + Math.sin(angle) * radius,
				size,
				delay: (i * 2000) / sparkleCount,
			};
		});
	}, [layout.height, layout.width, sparkleCount]);

	const handleLayout = (event: LayoutChangeEvent) => {
		const { width, height } = event.nativeEvent.layout;
		setLayout((current) => {
			if (current.width === width && current.height === height) {
				return current;
			}
			return { width, height };
		});
	};

	return (
		<View style={[styles.container, style]} onLayout={handleLayout}>
			{children}
			{enabled &&
				sparklePoints.map((sparkle) => (
					<Sparkle
						key={sparkle.id}
						x={sparkle.x}
						y={sparkle.y}
						size={sparkle.size}
						color={color}
						delay={sparkle.delay}
						enabled={enabled}
					/>
				))}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: "relative",
		alignItems: "center",
		justifyContent: "center",
	},
	sparkle: {
		position: "absolute",
		alignItems: "center",
		justifyContent: "center",
		pointerEvents: "none",
	},
	sparkleGlyph: {
		textAlign: "center",
		includeFontPadding: false,
	},
});
