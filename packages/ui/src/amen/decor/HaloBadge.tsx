import React, { type ReactNode } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";

interface HaloBadgeProps {
	children?: ReactNode;
	size?: number;
	haloColor?: string;
	haloWidth?: number;
	backgroundColor?: string;
	glowing?: boolean;
	style?: StyleProp<ViewStyle>;
}

export function HaloBadge({
	children,
	size = 48,
	haloColor = "#FFD700",
	haloWidth = 2,
	backgroundColor = "#FFFDF7",
	glowing = false,
	style,
}: HaloBadgeProps) {
	return (
		<View
			style={[
				{
					width: size,
					height: size,
					borderRadius: size / 2,
					borderWidth: haloWidth,
					borderColor: haloColor,
					backgroundColor: backgroundColor,
					alignItems: "center",
					justifyContent: "center",
					...(glowing
						? {
								shadowColor: haloColor,
								shadowOffset: { width: 0, height: 0 },
								shadowOpacity: 0.4,
								shadowRadius: 8,
								elevation: 5,
							}
						: {}),
				},
				style,
			]}
		>
			{children}
		</View>
	);
}
