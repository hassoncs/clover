import { WithCanvasKit } from "@slopcade/ui/Grainient";
import * as SplashScreen from "expo-splash-screen";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";

interface AnimatedSplashScreenProps {
	onAnimationComplete?: () => void;
	children: React.ReactNode;
}

const TOTAL_DURATION = 3000;
const STYLE_SWITCH_INTERVAL = 500;
const NUM_SWITCHES = Math.floor(TOTAL_DURATION / STYLE_SWITCH_INTERVAL);

const BG_COLORS = ["#000000", "#0a001a", "#001a0a", "#1a0a00", "#0a0a1a"];

const globalSplashState = {
	styleIndex: 0,
	time: 0,
};

export function AnimatedSplashScreen({
	onAnimationComplete,
	children,
}: AnimatedSplashScreenProps) {
	const [isAppReady, setIsAppReady] = useState(false);
	const [isSplashAnimationComplete, setIsSplashAnimationComplete] =
		useState(false);
	const [currentStyleIndex, setCurrentStyleIndex] = useState(0);
	const [currentBgIndex, setCurrentBgIndex] = useState(0);
	const [showSplash, setShowSplash] = useState(true);

	const styleSequence = useMemo(() => {
		const seq: number[] = [];
		for (let i = 0; i < NUM_SWITCHES; i++) {
			seq.push(i % 6);
		}
		return seq;
	}, []);

	const bgSequence = useMemo(() => {
		const seq: number[] = [];
		for (let i = 0; i < NUM_SWITCHES; i++) {
			seq.push(Math.floor(Math.random() * BG_COLORS.length));
		}
		return seq;
	}, []);

	const opacity = useSharedValue(1);
	const scale = useSharedValue(1);
	const contentOpacity = useSharedValue(0);

	const handleAnimationComplete = useCallback(() => {
		setIsSplashAnimationComplete(true);
		onAnimationComplete?.();
	}, [onAnimationComplete]);

	useEffect(() => {
		async function prepare() {
			try {
				await SplashScreen.preventAutoHideAsync();
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
		if (!isAppReady || isSplashAnimationComplete) return;

		const startTime = Date.now();
		let switchCount = 0;

		const animationFrame = () => {
			const elapsed = Date.now() - startTime;
			globalSplashState.time = elapsed;

			if (
				elapsed >=
				switchCount * STYLE_SWITCH_INTERVAL + STYLE_SWITCH_INTERVAL
			) {
				if (switchCount < NUM_SWITCHES - 1) {
					const newStyleIndex = styleSequence[switchCount];
					setCurrentStyleIndex(newStyleIndex);
					globalSplashState.styleIndex = newStyleIndex;
					setCurrentBgIndex(bgSequence[switchCount]);
					switchCount++;
				}
			}

			if (elapsed < TOTAL_DURATION) {
				requestAnimationFrame(animationFrame);
			}
		};

		globalSplashState.styleIndex = 0;
		requestAnimationFrame(animationFrame);
	}, [isAppReady, isSplashAnimationComplete, styleSequence, bgSequence]);

	useEffect(() => {
		if (!isAppReady) return;

		const timeout = setTimeout(() => {
			opacity.value = withTiming(0, { duration: 350 });
			scale.value = withTiming(1.4, { duration: 350 });
			contentOpacity.value = withDelay(150, withTiming(1, { duration: 200 }));

			setTimeout(async () => {
				await SplashScreen.hideAsync();
				setShowSplash(false);
				handleAnimationComplete();
			}, 400);
		}, TOTAL_DURATION - 100);

		return () => clearTimeout(timeout);
	}, [isAppReady, opacity, scale, contentOpacity, handleAnimationComplete]);

	const contentAnimatedStyle = useAnimatedStyle(() => ({
		opacity: contentOpacity.value,
	}));

	if (isSplashAnimationComplete) {
		return <>{children}</>;
	}

	const currentBg = BG_COLORS[currentBgIndex];

	return (
		<View style={styles.container}>
			<Animated.View style={[styles.content, contentAnimatedStyle]}>
				{children}
			</Animated.View>

			{showSplash && (
				<Animated.View
					style={[
						styles.splashOverlay,
						{
							backgroundColor: currentBg,
							opacity,
							transform: [{ scale }],
						},
					]}
				>
					<WithCanvasKit
						getComponent={async () => {
							const mod = await import("./SplashSkiaCanvas");
							return {
								default: () => (
									<mod.default
										styleIndex={globalSplashState.styleIndex}
										time={globalSplashState.time}
									/>
								),
							};
						}}
						fallback={<FallbackText styleIndex={currentStyleIndex} />}
						fadeInDuration={0}
					/>
				</Animated.View>
			)}
		</View>
	);
}

function FallbackText({ styleIndex }: { styleIndex: number }) {
	const colors = ["#FF00FF", "#00FF41", "#FF4500", "#39FF14", "#FFD700"];
	const color = colors[styleIndex % colors.length];

	return (
		<View style={styles.fallbackContainer}>
			<Text style={[styles.fallbackText, { color }]}>SLOPCADE</Text>
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
		justifyContent: "center",
		alignItems: "center",
		zIndex: 999,
	},
	fallbackContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	fallbackText: {
		fontSize: 48,
		fontWeight: "900",
		letterSpacing: 3,
		textAlign: "center",
	},
});
