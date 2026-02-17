import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import { AMEN_ICONS, type AmenIconName } from "./registry";

interface AmenIconProps {
	name: AmenIconName;
	size?: number;
	color?: string;
	glow?: boolean;
	style?: StyleProp<ViewStyle>;
}

const glowStyle: ViewStyle = {
	shadowColor: "#FFD700",
	shadowOffset: { width: 0, height: 0 },
	shadowOpacity: 0.6,
	shadowRadius: 8,
};

export function AmenIcon({
	name,
	size = 24,
	color = "#C9A84C",
	glow = false,
	style,
}: AmenIconProps) {
	const iconName = AMEN_ICONS[name];

	return (
		<View style={[glow && glowStyle, style]}>
			<MaterialCommunityIcons
				name={iconName as any}
				size={size}
				color={color}
			/>
		</View>
	);
}
