import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";

interface CaptionOverlayProps {
	text: string | null;
	visible: boolean;
}

export function CaptionOverlay({ text, visible }: CaptionOverlayProps) {
	const opacity = useSharedValue(visible && text ? 1 : 0);

	useEffect(() => {
		opacity.value = withTiming(visible && text ? 1 : 0, { duration: 300 });
	}, [visible, text, opacity]);

	const animatedStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
	}));

	if (!text) return null;

	return (
		<Animated.View
			style={animatedStyle}
			className="absolute bottom-8 left-4 right-4 items-center"
			pointerEvents="none"
		>
			<View className="bg-[#1B3A6B]/90 px-6 py-3 rounded-xl max-w-[90%]">
				<Text className="text-[#FFFDF7] text-center text-lg font-medium">
					{text}
				</Text>
			</View>
		</Animated.View>
	);
}
