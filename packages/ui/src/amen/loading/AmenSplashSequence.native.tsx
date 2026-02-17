import type React from "react";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	Easing,
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";

interface AmenSplashSequenceProps {
	onComplete?: () => void;
	duration?: number;
}

export const AmenSplashSequence: React.FC<AmenSplashSequenceProps> = ({
	onComplete,
	duration = 3000,
}) => {
	const crossOpacity = useSharedValue(0);
	const crossScale = useSharedValue(0.94);
	const textOpacity = useSharedValue(0);
	const textTranslateY = useSharedValue(10);
	const completionSignal = useSharedValue(0);

	useEffect(() => {
		const phase = Math.max(1, Math.floor(duration / 3));

		crossOpacity.value = withTiming(0.8, {
			duration: phase,
			easing: Easing.out(Easing.cubic),
		});

		crossScale.value = withDelay(
			phase,
			withTiming(1.05, {
				duration: phase,
				easing: Easing.out(Easing.quad),
			}),
		);

		crossOpacity.value = withDelay(
			phase,
			withTiming(1, {
				duration: phase,
				easing: Easing.out(Easing.quad),
			}),
		);

		textOpacity.value = withDelay(
			phase * 2,
			withTiming(1, {
				duration: phase,
				easing: Easing.out(Easing.cubic),
			}),
		);

		textTranslateY.value = withDelay(
			phase * 2,
			withTiming(0, {
				duration: phase,
				easing: Easing.out(Easing.cubic),
			}),
		);

		if (onComplete) {
			completionSignal.value = withDelay(
				duration,
				withTiming(1, { duration: 1 }, (finished) => {
					if (finished) {
						runOnJS(onComplete)();
					}
				}),
			);
		}
	}, [
		crossOpacity,
		crossScale,
		completionSignal,
		duration,
		onComplete,
		textOpacity,
		textTranslateY,
	]);

	const crossStyle = useAnimatedStyle(() => ({
		opacity: crossOpacity.value,
		transform: [{ scale: crossScale.value }],
	}));

	const textStyle = useAnimatedStyle(() => ({
		opacity: textOpacity.value,
		transform: [{ translateY: textTranslateY.value }],
	}));

	return (
		<View style={styles.container}>
			<Animated.Text style={[styles.cross, crossStyle]}>✝</Animated.Text>
			<Animated.Text style={[styles.label, textStyle]}>AMEN</Animated.Text>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#FFFDF7",
		alignItems: "center",
		justifyContent: "center",
	},
	cross: {
		fontSize: 96,
		color: "#C9A84C",
		fontWeight: "700",
	},
	label: {
		marginTop: 24,
		fontFamily: "serif",
		fontSize: 24,
		letterSpacing: 4,
		color: "#C9A84C",
		fontWeight: "700",
	},
});
