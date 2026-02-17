import type React from "react";
import { useEffect } from "react";
import {
	type StyleProp,
	StyleSheet,
	Text,
	View,
	type ViewStyle,
} from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";

interface DrawingIconProps {
	path: string;
	viewBox?: string;
	size?: number;
	strokeColor?: string;
	strokeWidth?: number;
	duration?: number;
	delay?: number;
	fillColor?: string;
	enabled?: boolean;
	style?: StyleProp<ViewStyle>;
}

export const DrawingIcon: React.FC<DrawingIconProps> = ({
	path: _path,
	viewBox: _viewBox = "0 0 24 24",
	size = 48,
	strokeColor = "#C9A84C",
	strokeWidth: _strokeWidth = 2,
	duration = 1500,
	delay = 0,
	fillColor: _fillColor = "none",
	enabled = true,
	style,
}) => {
	const opacity = useSharedValue(enabled ? 0 : 1);

	useEffect(() => {
		opacity.value = enabled
			? withDelay(
					delay,
					withTiming(1, {
						duration,
						easing: Easing.out(Easing.cubic),
					}),
				)
			: 1;
	}, [delay, duration, enabled, opacity]);

	const animatedStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
	}));

	return (
		<Animated.View
			style={[
				styles.container,
				{ width: size, height: size },
				animatedStyle,
				style,
			]}
		>
			<View style={styles.center}>
				<Text
					style={[styles.icon, { color: strokeColor, fontSize: size * 0.75 }]}
				>
					✝
				</Text>
			</View>
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		justifyContent: "center",
	},
	center: {
		alignItems: "center",
		justifyContent: "center",
		flex: 1,
	},
	icon: {
		fontWeight: "700",
	},
});
