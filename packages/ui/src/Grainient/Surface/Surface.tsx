import { grainient, radii, spacing } from "@slopcade/theme";
import { useColorScheme } from "nativewind";
import { forwardRef } from "react";
import { StyleSheet, View } from "react-native";
import { cn } from "../../lib/cn";
import { GradientFill, GrainOverlay } from "..";
import type { SurfaceProps } from "./types";

const resolveRadius = (r: any): number => {
	if (typeof r === "number") return r;
	if (!r) return 0;
	// @ts-expect-error
	const val = radii[r];
	return val ? Number.parseFloat(val) : 0;
};

const resolvePadding = (p: any): number => {
	if (typeof p === "number") return p;
	if (!p) return 0;
	// @ts-expect-error
	const val = spacing[p];
	return val ? Number.parseFloat(val) : 0;
};

export const Surface = forwardRef<View, SurfaceProps>(
	(
		{
			variant = "glass",
			palette = "ultraviolet",
			radius = "md",
			padding = 4,
			disableGrain = false,
			className,
			style,
			children,
			...props
		},
		ref,
	) => {
		const { colorScheme } = useColorScheme();
		const mode = colorScheme === "dark" ? "dark" : "light";

		const borderRadius = resolveRadius(radius);
		const p = resolvePadding(padding);

		const paletteConfig =
			grainient.palettes[palette] || grainient.palettes.ultraviolet;
		const paletteColors = paletteConfig.gradient;

		const getBackgroundStyle = () => {
			switch (variant) {
				case "glass":
					return {
						backgroundColor: grainient.surfaces[mode].glass,
					};
				case "solid":
					return {
						backgroundColor: paletteConfig.surface[mode],
						borderColor: paletteConfig.border[mode],
						borderWidth: 1,
					};
				case "grainient":
				default:
					return {
						backgroundColor: "transparent",
					};
			}
		};

		return (
			<View
				ref={ref}
				style={[
					{
						borderRadius,
						padding: p,
						overflow: "hidden",
					},
					getBackgroundStyle(),
					style,
				]}
				className={cn("relative", className)}
				{...props}
			>
				{variant === "grainient" && (
					<View style={StyleSheet.absoluteFill}>
						<GradientFill
							colors={paletteColors}
							style={StyleSheet.absoluteFill}
						/>
					</View>
				)}

				{!disableGrain && (
					<View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
						<GrainOverlay
							style={StyleSheet.absoluteFill}
							opacity={variant === "solid" ? 0.05 : 0.1}
						/>
					</View>
				)}

				<View style={{ zIndex: 1 }}>{children}</View>
			</View>
		);
	},
);

Surface.displayName = "Surface";
