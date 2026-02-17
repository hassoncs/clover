import React from "react";
import {
	type DimensionValue,
	type LayoutChangeEvent,
	type StyleProp,
	StyleSheet,
	View,
	type ViewStyle,
} from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withTiming,
} from "react-native-reanimated";

interface ShimmerSurfaceProps {
	width?: DimensionValue;
	height?: DimensionValue;
	borderRadius?: number;
	shimmerColor?: string;
	baseColor?: string;
	speed?: number;
	enabled?: boolean;
	style?: StyleProp<ViewStyle>;
	children?: React.ReactNode;
}

export const ShimmerSurface: React.FC<ShimmerSurfaceProps> = ({
	width = "100%",
	height = 200,
	borderRadius = 12,
	shimmerColor = "rgba(255, 215, 0, 0.15)",
	baseColor = "rgba(255, 253, 247, 1)",
	speed = 2000,
	enabled = true,
	style,
	children,
}) => {
	const shimmerX = useSharedValue(0);
	const [surfaceWidth, setSurfaceWidth] = React.useState(
		typeof width === "number" ? width : 0,
	);
	const shimmerWidth = surfaceWidth > 0 ? Math.max(40, surfaceWidth * 0.3) : 80;

	React.useEffect(() => {
		if (!enabled || surfaceWidth <= 0) {
			cancelAnimation(shimmerX);
			shimmerX.value = 0;
			return;
		}

		const startX = -shimmerWidth;
		const endX = surfaceWidth + shimmerWidth;
		shimmerX.value = startX;
		shimmerX.value = withRepeat(
			withSequence(
				withTiming(endX, {
					duration: Math.max(300, speed),
					easing: Easing.linear,
				}),
				withTiming(startX, { duration: 0 }),
			),
			-1,
			false,
		);

		return () => {
			cancelAnimation(shimmerX);
		};
	}, [enabled, shimmerWidth, shimmerX, speed, surfaceWidth]);

	const shimmerStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: shimmerX.value }],
	}));

	const handleLayout = (event: LayoutChangeEvent) => {
		const nextWidth = event.nativeEvent.layout.width;
		if (nextWidth > 0 && nextWidth !== surfaceWidth) {
			setSurfaceWidth(nextWidth);
		}
	};

	return (
		<View
			onLayout={handleLayout}
			style={[
				styles.container,
				{ width, height, borderRadius, backgroundColor: baseColor },
				style,
			]}
		>
			{enabled && (
				<Animated.View
					pointerEvents="none"
					style={[
						styles.shimmer,
						{
							width: shimmerWidth,
							backgroundColor: shimmerColor,
						},
						shimmerStyle,
					]}
				/>
			)}
			{children}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		overflow: "hidden",
		position: "relative",
	},
	shimmer: {
		position: "absolute",
		top: 0,
		bottom: 0,
		opacity: 0.7,
	},
});
