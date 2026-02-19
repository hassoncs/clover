import React, { useEffect, useMemo } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withRepeat,
	withSequence,
	withTiming,
} from "react-native-reanimated";

const CONFETTI_COLORS = ["#C9A84C", "#FFFDF7", "#E5C56C"];
const PARTICLE_COUNT = 30;
const DURATION = 5000;

interface ParticleProps {
	index: number;
	width: number;
	height: number;
}

function ConfettiParticle({ index, width, height }: ParticleProps) {
	const x = useMemo(() => Math.random() * width, [width]);
	const startY = -20;
	const endY = height + 20;

	const translateY = useSharedValue(startY);
	const rotate = useSharedValue(0);
	const opacity = useSharedValue(1);

	const color = useMemo(
		() => CONFETTI_COLORS[index % CONFETTI_COLORS.length],
		[index],
	);
	const size = useMemo(() => 8 + Math.random() * 8, []);
	const speed = useMemo(() => 2000 + Math.random() * 1500, []);
	const delay = useMemo(() => Math.random() * 2000, []);

	useEffect(() => {
		translateY.value = withDelay(
			delay,
			withRepeat(
				withTiming(endY, {
					duration: speed,
					easing: Easing.linear,
				}),
				-1,
				false,
			),
		);

		rotate.value = withDelay(
			delay,
			withRepeat(
				withTiming(360, {
					duration: speed * 0.8,
					easing: Easing.linear,
				}),
				-1,
				false,
			),
		);

		// Fade out after main duration
		opacity.value = withSequence(
			withDelay(DURATION, withTiming(0, { duration: 1000 })),
		);

		return () => {
			cancelAnimation(translateY);
			cancelAnimation(rotate);
			cancelAnimation(opacity);
		};
	}, [translateY, rotate, opacity, endY, speed, delay]);

	const style = useAnimatedStyle(() => ({
		transform: [
			{ translateX: x },
			{ translateY: translateY.value },
			{ rotate: `${rotate.value}deg` },
			{ rotateX: `${rotate.value}deg` },
		],
		opacity: opacity.value,
	}));

	return (
		<Animated.View
			style={[
				{
					position: "absolute",
					width: size,
					height: size,
					backgroundColor: color,
					borderRadius: index % 2 === 0 ? size / 2 : 2,
				},
				style,
			]}
		/>
	);
}

export function ConfettiOverlay() {
	const { width, height } = useWindowDimensions();
	const particles = useMemo(
		() => Array.from({ length: PARTICLE_COUNT }).map((_, i) => i),
		[],
	);

	return (
		<View
			pointerEvents="none"
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				zIndex: 100,
				overflow: "hidden",
			}}
		>
			{particles.map((i) => (
				<ConfettiParticle key={i} index={i} width={width} height={height} />
			))}
		</View>
	);
}
