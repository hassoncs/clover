import type React from "react";
import { useId } from "react";
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

export const AmenGrainOverlay: React.FC<AmenGrainOverlayProps> = ({
	intensity = 0.08,
	tint = "#FFD700",
	blendMode = "overlay",
	style,
}) => {
	const id = useId().replace(/:/g, "");
	const filterId = `amen-grain-filter-${id}`;

	return (
		<View
			style={[
				StyleSheet.absoluteFill,
				{
					zIndex: 1,
					mixBlendMode: blendMode,
				} as any,
				style,
			]}
			pointerEvents="none"
		>
			<svg
				viewBox="0 0 200 200"
				preserveAspectRatio="none"
				xmlns="http://www.w3.org/2000/svg"
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: "100%",
					height: "100%",
				}}
				aria-hidden="true"
			>
				<filter id={filterId} x="0%" y="0%" width="100%" height="100%">
					<feTurbulence
						type="fractalNoise"
						baseFrequency="0.65"
						numOctaves="3"
						stitchTiles="stitch"
						result="noise"
					/>
					<feColorMatrix
						type="luminanceToAlpha"
						in="noise"
						result="alphaNoise"
					/>
					<feComponentTransfer in="alphaNoise" result="adjustedNoise">
						<feFuncA type="linear" slope={intensity} />
					</feComponentTransfer>
					<feFlood floodColor={tint} result="color" />
					<feComposite
						operator="in"
						in="color"
						in2="adjustedNoise"
						result="grain"
					/>
				</filter>
				<rect
					width="100%"
					height="100%"
					fill="transparent"
					filter={`url(#${filterId})`}
				/>
			</svg>
		</View>
	);
};
