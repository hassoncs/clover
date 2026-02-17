import React from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import { AmenIcon, type AmenIconName } from "../icons";

interface MotifDividerProps {
	icon?: AmenIconName;
	color?: string;
	lineColor?: string;
	size?: "sm" | "md" | "lg";
	style?: StyleProp<ViewStyle>;
}

const SIZES = {
	sm: 16,
	md: 20,
	lg: 24,
};

export function MotifDivider({
	icon = "cross",
	color = "#C9A84C",
	lineColor = "rgba(201, 168, 76, 0.3)",
	size = "md",
	style,
}: MotifDividerProps) {
	return (
		<View
			style={[
				{
					flexDirection: "row",
					alignItems: "center",
					width: "100%",
				},
				style,
			]}
		>
			<View style={{ height: 1, flex: 1, backgroundColor: lineColor }} />
			<View style={{ paddingHorizontal: 8 }}>
				<AmenIcon name={icon} size={SIZES[size]} color={color} />
			</View>
			<View style={{ height: 1, flex: 1, backgroundColor: lineColor }} />
		</View>
	);
}
