import * as SplashScreen from "expo-splash-screen";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Animated, Image, Platform, StyleSheet, View } from "react-native";

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

	const scaleAnim = useRef(new Animated.Value(1)).current;
	const opacityAnim = useRef(new Animated.Value(1)).current;
	const translateYAnim = useRef(new Animated.Value(0)).current;
	const contentOpacityAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		async function prepare() {
			try {
				await SplashScreen.preventAutoHideAsync();
				await new Promise((resolve) => setTimeout(resolve, 1500));
				setIsAppReady(true);
			} catch (error) {
				console.warn("Error preparing app:", error);
				setIsAppReady(true);
			}
		}

		prepare();
	}, []);

	useEffect(() => {
		if (isAppReady) {
			Animated.parallel([
				Animated.timing(scaleAnim, {
					toValue: 1.2,
					duration: 400,
					useNativeDriver: Platform.OS !== "web",
				}),
				Animated.timing(opacityAnim, {
					toValue: 0,
					duration: 500,
					useNativeDriver: Platform.OS !== "web",
				}),
				Animated.timing(translateYAnim, {
					toValue: -30,
					duration: 500,
					useNativeDriver: Platform.OS !== "web",
				}),
				Animated.timing(contentOpacityAnim, {
					toValue: 1,
					duration: 400,
					delay: 200,
					useNativeDriver: Platform.OS !== "web",
				}),
			]).start(async () => {
				await SplashScreen.hideAsync();
				setIsSplashAnimationComplete(true);
				onAnimationComplete?.();
			});
		}
	}, [
		isAppReady,
		scaleAnim,
		opacityAnim,
		translateYAnim,
		contentOpacityAnim,
		onAnimationComplete,
	]);

	return (
		<View style={styles.container}>
			<Animated.View
				style={[
					styles.content,
					!isSplashAnimationComplete && { opacity: contentOpacityAnim },
				]}
			>
				{children}
			</Animated.View>

			{!isSplashAnimationComplete && (
				<Animated.View
					style={[
						styles.splashOverlay,
						{
							opacity: opacityAnim,
							transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
						},
					]}
				>
					<Image
						source={require("../assets/splash.jpg")}
						style={styles.splashImage}
						resizeMode="contain"
					/>
				</Animated.View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		flex: 1,
	},
	splashOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "#1a1a2e",
		justifyContent: "center",
		alignItems: "center",
		zIndex: 999,
	},
	splashImage: {
		width: 200,
		height: 200,
	},
});
