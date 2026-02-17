import React, { type ReactNode } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

interface GlowIconProps {
	children: ReactNode;
	color?: string;
	intensity?: number;
	speed?: number;
	enabled?: boolean;
	style?: StyleProp<ViewStyle>;
}

export function GlowIcon({
	children,
	color = "#FFD700",
	intensity = 0.8,
	speed = 2000,
	enabled = true,
	style,
}: GlowIconProps) {
	const animationName = `amen-glow-breathe-${speed}-${intensity}-${color.replace(
		"#",
		"",
	)}`;

	const animationStyle = enabled
		? {
				animation: `${animationName} ${speed}ms ease-in-out infinite`,
			}
		: {};

	return (
		<View style={[styles.container, style]}>
			<View
				style={[
					{
						filter: `drop-shadow(0 0 ${8 * intensity}px ${color})`,
					} as any,
					animationStyle as any,
				]}
			>
				{children}
			</View>
			{enabled && (
				<style
					// eslint-disable-next-line react/no-danger
					dangerouslySetInnerHTML={{
						__html: `
            @keyframes ${animationName} {
              0%, 100% { opacity: ${
								0.4 * intensity
							}; filter: drop-shadow(0 0 ${4 * intensity}px ${color}); }
              50% { opacity: 1; filter: drop-shadow(0 0 ${
								12 * intensity
							}px ${color}); }
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
		alignItems: "center",
		justifyContent: "center",
	},
});
