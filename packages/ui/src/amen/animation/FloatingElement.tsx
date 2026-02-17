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

interface FloatingElementProps {
	children: ReactNode;
	amplitude?: number;
	duration?: number;
	enabled?: boolean;
	style?: StyleProp<ViewStyle>;
}

export function FloatingElement({
	children,
	amplitude = 6,
	duration = 3000,
	enabled = true,
	style,
}: FloatingElementProps) {
	const translateY = useSharedValue(0);

	useEffect(() => {
		if (!enabled) {
			cancelAnimation(translateY);
			translateY.value = withTiming(0, { duration: 150 });
			return;
		}

		translateY.value = 0;
		translateY.value = withRepeat(
			withTiming(-Math.abs(amplitude), {
				duration: Math.max(300, duration / 2),
				easing: Easing.inOut(Easing.ease),
			}),
			-1,
			true,
		);

		return () => {
			cancelAnimation(translateY);
		};
	}, [amplitude, duration, enabled, translateY]);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: translateY.value }],
	}));

	return (
		<Animated.View style={[styles.container, style, animatedStyle]}>
			{children}
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {},
});
