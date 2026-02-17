import React, { type ReactNode, useEffect } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";

interface GlowIconProps {
	children: ReactNode;
	color?: string;
	intensity?: number;
	speed?: number;
	enabled?: boolean;
	style?: StyleProp<ViewStyle>;
}

export function GlowIcon({
	children,
	color = "#FFD700",
	intensity = 0.8,
	speed = 2000,
	enabled = true,
	style,
}: GlowIconProps) {
	const glowOpacity = useSharedValue(enabled ? 1 : 0.4 * intensity);

	useEffect(() => {
		if (!enabled) {
			cancelAnimation(glowOpacity);
			glowOpacity.value = withTiming(1, { duration: 180 });
			return;
		}

		const minOpacity = Math.max(0.1, Math.min(0.9, 0.4 * intensity));
		glowOpacity.value = minOpacity;
		glowOpacity.value = withRepeat(
			withTiming(1, {
				duration: Math.max(300, speed / 2),
				easing: Easing.inOut(Easing.ease),
			}),
			-1,
			true,
		);

		return () => {
			cancelAnimation(glowOpacity);
		};
	}, [enabled, glowOpacity, intensity, speed]);

	const animatedGlowStyle = useAnimatedStyle(() => ({
		opacity: glowOpacity.value,
	}));

	const shadowStrength = Math.max(0.1, intensity);

	return (
		<View style={[styles.container, style]}>
			<Animated.View
				style={[
					styles.glow,
					{
						shadowColor: color,
						shadowOffset: { width: 0, height: 0 },
						shadowOpacity: Math.min(1, 0.5 * shadowStrength),
						shadowRadius: 8 * shadowStrength,
						elevation: 3 + shadowStrength * 4,
					},
					animatedGlowStyle,
				]}
			>
				{children}
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		justifyContent: "center",
	},
	glow: {
		alignItems: "center",
		justifyContent: "center",
	},
});
