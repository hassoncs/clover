import type React from "react";
import { Pressable, View, type ViewStyle } from "react-native";

export interface GameHallTileProps {
	selected: boolean;
	onPress: () => void;
	title: string;
	width: number;
	height: number;
	children: React.ReactNode;
	style?: ViewStyle;
}

export function GameHallTile({
	selected,
	onPress,
	title,
	width,
	height,
	children,
	style,
}: GameHallTileProps) {
	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={title}
			accessibilityState={{ selected }}
			style={style}
		>
			<View style={{ width, height }}>{children}</View>
		</Pressable>
	);
}
