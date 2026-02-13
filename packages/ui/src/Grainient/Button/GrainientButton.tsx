import { grainient } from "@slopcade/theme";
import { forwardRef } from "react";
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { cn } from "../../lib/cn";
import { GradientFill, GrainOverlay } from "../index";
import type { ButtonProps, ButtonVariant } from "./types";
import { buttonTextVariants, buttonVariants } from "./variants";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const getSpinnerColor = (variant: ButtonVariant = "grainient") => {
	switch (variant) {
		case "grainient":
			return "white";
		case "glass":
			return "rgba(255, 255, 255, 0.9)";
		case "solid":
			return "#f4f4f5";
		case "outline":
			return "#d4d4d8";
		case "ghost":
			return "#a1a1aa";
		default:
			return "white";
	}
};

export const GrainientButton = forwardRef<View, ButtonProps>(
	(
		{
			className,
			variant = "grainient",
			size = "md",
			palette = "ultraviolet",
			label,
			children,
			iconLeft,
			iconRight,
			loading,
			style,
			...props
		},
		ref,
	) => {
		const scale = useSharedValue(1);
		const opacity = useSharedValue(1);

		const animatedStyle = useAnimatedStyle(() => ({
			transform: [{ scale: scale.value }],
			opacity: opacity.value,
		}));

		const pressGrainStyle = useAnimatedStyle(() => ({
			opacity: scale.value < 1 ? 1 : 0,
		}));

		const handlePressIn = () => {
			scale.value = withTiming(0.97, { duration: 100 });
			opacity.value = withTiming(0.9, { duration: 100 });
		};

		const handlePressOut = () => {
			scale.value = withTiming(1, { duration: 150 });
			opacity.value = withTiming(1, { duration: 150 });
		};

		const safeVariant = variant || "grainient";
		const paletteColors =
			grainient.palettes[palette]?.gradient ||
			grainient.palettes.ultraviolet.gradient;

		const showGrain =
			safeVariant === "grainient" ||
			safeVariant === "glass" ||
			safeVariant === "solid";
		const showGrainOnPress = safeVariant === "outline";

		let grainOpacity: number | undefined;
		if (safeVariant === "solid") grainOpacity = 0.05;
		if (safeVariant === "outline") grainOpacity = 0.1;

		return (
			<AnimatedPressable
				ref={ref}
				onPressIn={handlePressIn}
				onPressOut={handlePressOut}
				style={[animatedStyle, style]}
				className={cn(buttonVariants({ variant, size, className }))}
				disabled={loading || props.disabled}
				{...props}
			>
				{safeVariant === "grainient" && (
					<View style={StyleSheet.absoluteFill}>
						<GradientFill
							colors={paletteColors}
							style={StyleSheet.absoluteFill}
						/>
					</View>
				)}

				{(showGrain || showGrainOnPress) && (
					<View style={StyleSheet.absoluteFill}>
						{showGrainOnPress ? (
							<Animated.View style={[StyleSheet.absoluteFill, pressGrainStyle]}>
								<GrainOverlay
									style={StyleSheet.absoluteFill}
									opacity={grainOpacity}
								/>
							</Animated.View>
						) : (
							<GrainOverlay
								style={StyleSheet.absoluteFill}
								opacity={grainOpacity}
							/>
						)}
					</View>
				)}

				<View className="flex-row items-center gap-2 z-10">
					{loading ? (
						<ActivityIndicator
							size="small"
							color={getSpinnerColor(safeVariant)}
						/>
					) : (
						<>
							{iconLeft}
							{label ? (
								<Text className={cn(buttonTextVariants({ variant, size }))}>
									{label}
								</Text>
							) : (
								children
							)}
							{iconRight}
						</>
					)}
				</View>
			</AnimatedPressable>
		);
	},
);

GrainientButton.displayName = "GrainientButton";
