import type React from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

interface AmenGrainOverlayProps {
	intensity?: number;
	tint?: string;
	blendMode?:
		| "overlay"
		| "multiply"
		| "soft-light"
		| "screen"
		| "darken"
		| "lighten"
		| "color-dodge"
		| "color-burn"
		| "hard-light"
		| "difference"
		| "exclusion"
		| "hue"
		| "saturation"
		| "color"
		| "luminosity";
	style?: StyleProp<ViewStyle>;
}
const clamp = (value: number, min: number, max: number): number => {
	return Math.min(max, Math.max(min, value));
};

export const AmenGrainOverlay: React.FC<AmenGrainOverlayProps> = ({
	intensity = 0.08,
	tint = "#FFD700",
	blendMode: _blendMode = "overlay",
	style,
}) => {
	const opacity = clamp(intensity, 0, 1);

	return (
		<View
			style={[
				StyleSheet.absoluteFill,
				styles.overlay,
				{
					backgroundColor: tint,
					opacity,
				},
				style,
			]}
			pointerEvents="none"
		/>
	);
};

const styles = StyleSheet.create({
	overlay: {
		zIndex: 1,
	},
});
