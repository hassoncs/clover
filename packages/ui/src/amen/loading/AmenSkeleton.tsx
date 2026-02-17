import type React from "react";
import { type DimensionValue, StyleSheet, View } from "react-native";
import { ShimmerSurface } from "../animation/ShimmerSurface";

interface AmenSkeletonProps {
	variant?: "card" | "line" | "circle" | "paragraph";
	width?: DimensionValue;
	height?: DimensionValue;
	borderRadius?: number;
	count?: number;
}

export const AmenSkeleton: React.FC<AmenSkeletonProps> = ({
	variant = "line",
	width,
	height,
	borderRadius,
	count = 3,
}) => {
	const baseColor = "rgba(255, 253, 247, 1)";
	const shimmerColor = "rgba(255, 215, 0, 0.15)";

	if (variant === "paragraph") {
		return (
			<View style={styles.paragraphContainer}>
				{Array.from({ length: count }).map((_, i) => {
					const lineWidth = i === count - 1 ? "60%" : "100%";
					return (
						<ShimmerSurface
							key={i}
							width={lineWidth}
							height={16}
							borderRadius={4}
							baseColor={baseColor}
							shimmerColor={shimmerColor}
							style={{ marginBottom: 8 }}
						/>
					);
				})}
			</View>
		);
	}

	let defaultWidth: DimensionValue = "100%";
	let defaultHeight: DimensionValue = 16;
	let defaultRadius = 4;

	if (variant === "card") {
		defaultWidth = 300;
		defaultHeight = 200;
		defaultRadius = 12;
	} else if (variant === "circle") {
		const size = typeof width === "number" ? width : 48;
		defaultWidth = size;
		defaultHeight = size;
		defaultRadius = size / 2;
	}

	return (
		<ShimmerSurface
			width={width ?? defaultWidth}
			height={height ?? defaultHeight}
			borderRadius={borderRadius ?? defaultRadius}
			baseColor={baseColor}
			shimmerColor={shimmerColor}
		/>
	);
};

const styles = StyleSheet.create({
	paragraphContainer: {
		width: "100%",
	},
});
