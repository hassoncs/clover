import React, { type ReactNode } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg";

interface PatternBackgroundProps {
	pattern?: "crosses" | "dots" | "fish";
	color?: string;
	spacing?: number;
	children?: ReactNode;
	style?: StyleProp<ViewStyle>;
}

export function PatternBackground({
	pattern = "crosses",
	color = "rgba(201, 168, 76, 0.05)",
	spacing = 40,
	children,
	style,
}: PatternBackgroundProps) {
	const renderPatternPath = () => {
		switch (pattern) {
			case "crosses":
				return (
					<Path
						d="M10 4 V16 M4 10 H16"
						stroke={color}
						strokeWidth="2"
						strokeLinecap="round"
					/>
				);
			case "dots":
				return (
					<Path
						d="M10 10 m-2 0 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0"
						fill={color}
					/>
				);
			case "fish":
				return (
					<Path
						d="M4 10 Q10 4 16 10 Q10 16 4 10 M16 10 L20 14 M16 10 L20 6"
						stroke={color}
						strokeWidth="1.5"
						fill="none"
					/>
				);
		}
	};

	return (
		<View style={[styles.container, style]}>
			<View style={StyleSheet.absoluteFill}>
				<Svg height="100%" width="100%">
					<Defs>
						<Pattern
							id={`pattern-${pattern}`}
							patternUnits="userSpaceOnUse"
							width={spacing}
							height={spacing}
						>
							{renderPatternPath()}
						</Pattern>
					</Defs>
					<Rect
						x="0"
						y="0"
						width="100%"
						height="100%"
						fill={`url(#pattern-${pattern})`}
					/>
				</Svg>
			</View>
			{children}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {},
});
