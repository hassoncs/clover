import React, { type ReactNode } from "react";
import {
	type StyleProp,
	StyleSheet,
	Text,
	View,
	type ViewStyle,
} from "react-native";

interface SparkleWrapperProps {
	children: ReactNode;
	count?: number;
	color?: string;
	enabled?: boolean;
	style?: StyleProp<ViewStyle>;
}

export function SparkleWrapper({
	children,
	count = 6,
	color = "#FFD700",
	enabled = true,
	style,
}: SparkleWrapperProps) {
	const sparkles = Array.from({ length: Math.min(count, 12) }, (_, i) => i);
	const animationName = "amen-sparkle";

	return (
		<View style={[styles.container, style]}>
			{children}
			{enabled &&
				sparkles.map((i) => {
					const angle = (i / sparkles.length) * 2 * Math.PI;
					const radius = 50 + (i % 2) * 20;
					const top = 50 + Math.sin(angle) * radius;
					const left = 50 + Math.cos(angle) * radius;
					const delay = (i * 2000) / sparkles.length;
					const size = 8 + (i % 3) * 4;

					return (
						<View
							key={i}
							style={[
								styles.sparkle,
								{
									top: `${top}%`,
									left: `${left}%`,
									width: size,
									height: size,
									animation: `${animationName} 2000ms ease-in-out infinite`,
									animationDelay: `${delay}ms`,
								} as any,
							]}
						>
							<Text style={{ fontSize: size, lineHeight: size, color }}>✦</Text>
						</View>
					);
				})}
			{enabled && (
				<style
					// eslint-disable-next-line react/no-danger
					dangerouslySetInnerHTML={{
						__html: `
            @keyframes ${animationName} {
              0%, 100% { opacity: 0; transform: scale(0.5); }
              50% { opacity: 1; transform: scale(1); }
            }
          `,
					}}
				/>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: "relative",
		alignItems: "center",
		justifyContent: "center",
	},
	sparkle: {
		position: "absolute",
		alignItems: "center",
		justifyContent: "center",
		pointerEvents: "none",
	},
});
