import React from "react";
import {
	type DimensionValue,
	type StyleProp,
	View,
	type ViewStyle,
} from "react-native";

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
	const id = React.useId().replace(/:/g, "");
	const animationName = `shimmer-${id}`;

	const cssStyles = `
    @keyframes ${animationName} {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `;

	return (
		<View
			style={[
				{
					width,
					height,
					borderRadius,
					backgroundColor: baseColor,
					overflow: "hidden",
					position: "relative",
				},
				style,
			]}
		>
			{enabled && (
				<>
					<style>{cssStyles}</style>
					<div
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							height: "100%",
							background: `linear-gradient(90deg, transparent 0%, ${shimmerColor} 50%, transparent 100%)`,
							backgroundSize: "200% 100%",
							animation: `${animationName} ${speed}ms linear infinite`,
							pointerEvents: "none",
						}}
					/>
				</>
			)}
			{children}
		</View>
	);
};
