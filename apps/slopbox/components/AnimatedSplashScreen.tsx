import * as SplashScreen from "expo-splash-screen";
import type React from "react";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";

interface AnimatedSplashScreenProps {
	onAnimationComplete?: () => void;
	children: React.ReactNode;
}

export function AnimatedSplashScreen({
	onAnimationComplete,
	children,
}: AnimatedSplashScreenProps) {
	const [isAppReady, setIsAppReady] = useState(false);
	const [isSplashAnimationComplete, setIsSplashAnimationComplete] =
		useState(false);
	const [showSplash, setShowSplash] = useState(true);
	const [sequenceFinished, setSequenceFinished] = useState(false);

	const splashOpacity = useSharedValue(1);
	const splashScale = useSharedValue(1);
	const logoOpacity = useSharedValue(0);
	const contentOpacity = useSharedValue(0);

	useEffect(() => {
		async function prepare() {
			try {
				await SplashScreen.preventAutoHideAsync();
				// Small delay to ensure native splash is visible before we swap
				await new Promise((resolve) => setTimeout(resolve, 200));
				setIsAppReady(true);
			} catch (error) {
				console.warn("Error preparing app:", error);
				setIsAppReady(true);
			}
		}
		prepare();
	}, []);

	useEffect(() => {
		if (!isAppReady) return;

		logoOpacity.value = withTiming(1, { duration: 500 });
		const timer = setTimeout(() => {
			setSequenceFinished(true);
		}, 1600);

		return () => clearTimeout(timer);
	}, [isAppReady, logoOpacity]);

	useEffect(() => {
		if (isAppReady && sequenceFinished && showSplash) {
			splashOpacity.value = withTiming(0, { duration: 400 });
			splashScale.value = withTiming(1.05, { duration: 400 });
			contentOpacity.value = withTiming(1, { duration: 400 });

			const timer = setTimeout(async () => {
				await SplashScreen.hideAsync();
				setShowSplash(false);
				setIsSplashAnimationComplete(true);
				onAnimationComplete?.();
			}, 400);

			return () => clearTimeout(timer);
		}
	}, [
		isAppReady,
		sequenceFinished,
		showSplash,
		onAnimationComplete,
		splashOpacity,
		splashScale,
		contentOpacity,
	]);

	const contentAnimatedStyle = useAnimatedStyle(() => ({
		opacity: contentOpacity.value,
	}));

	const splashAnimatedStyle = useAnimatedStyle(() => ({
		opacity: splashOpacity.value,
		transform: [{ scale: splashScale.value }],
	}));

	const logoAnimatedStyle = useAnimatedStyle(() => ({
		opacity: logoOpacity.value,
	}));

	if (isSplashAnimationComplete) {
		return <>{children}</>;
	}

	return (
		<View style={styles.container}>
			<Animated.View style={[styles.content, contentAnimatedStyle]}>
				{children}
			</Animated.View>

			{showSplash && (
				<Animated.View style={[styles.splashOverlay, splashAnimatedStyle]}>
					<Animated.View style={logoAnimatedStyle}>
						<Text style={styles.logoText}>Slopbox</Text>
					</Animated.View>
				</Animated.View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#0D1117",
	},
	content: {
		flex: 1,
	},
	splashOverlay: {
		...StyleSheet.absoluteFillObject,
		zIndex: 999,
		backgroundColor: "#0D1117",
		alignItems: "center",
		justifyContent: "center",
	},
	logoText: {
		color: "#22c55e",
		fontSize: 44,
		fontWeight: "800",
		letterSpacing: 2,
	},
});
