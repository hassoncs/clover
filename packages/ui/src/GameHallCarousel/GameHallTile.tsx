import type React from "react";
import { useEffect } from "react";
import { Pressable, type ViewStyle } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";

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
	const scale = useSharedValue(0.85);

	useEffect(() => {
		scale.value = withSpring(selected ? 1.15 : 0.85, {
			damping: 15,
			stiffness: 150,
		});
	}, [selected, scale]);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));

	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={title}
			accessibilityState={{ selected }}
			style={style}
		>
			<Animated.View style={[{ width, height }, animatedStyle]}>
				{children}
			</Animated.View>
		</Pressable>
	);
}
