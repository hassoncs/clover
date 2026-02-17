import React, { type ReactNode } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";

interface FloatingElementProps {
	children: ReactNode;
	amplitude?: number;
	duration?: number;
	enabled?: boolean;
	style?: StyleProp<ViewStyle>;
}

export function FloatingElement({
	children,
	amplitude = 6,
	duration = 3000,
	enabled = true,
	style,
}: FloatingElementProps) {
	const animationName = `amen-float-${amplitude}-${duration}`;

	const animationStyle = enabled
		? {
				animation: `${animationName} ${duration}ms ease-in-out infinite`,
			}
		: {};

	return (
		<View style={[styles.container, style, animationStyle as any]}>
			{children}
			{enabled && (
				<style
					// eslint-disable-next-line react/no-danger
					dangerouslySetInnerHTML={{
						__html: `
            @keyframes ${animationName} {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-${amplitude}px); }
            }
          `,
					}}
				/>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {},
});
