import type React from "react";
import { useCallback } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import {
	Gesture,
	GestureDetector,
	GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";

interface DraggableTokenProps {
	id: string;
	label: string;
	onDragStart?: (id: string) => void;
	onDragEnd?: (id: string, position: { x: number; y: number }) => void;
	onDrop?: (id: string, targetId: string) => void;
	disabled?: boolean;
	style?: ViewStyle;
	children?: React.ReactNode;
}

export function DraggableToken({
	id,
	label,
	onDragStart,
	onDragEnd,
	onDrop,
	disabled = false,
	style,
	children,
}: DraggableTokenProps) {
	const translateX = useSharedValue(0);
	const translateY = useSharedValue(0);
	const scale = useSharedValue(1);
	const isDragging = useSharedValue(false);
	const zIndex = useSharedValue(1);

	const context = useSharedValue({ x: 0, y: 0 });

	const handleDragStart = useCallback(() => {
		onDragStart?.(id);
	}, [id, onDragStart]);

	const handleDragEnd = useCallback(
		(x: number, y: number) => {
			onDragEnd?.(id, { x, y });
		},
		[id, onDragEnd],
	);

	const panGesture = Gesture.Pan()
		.enabled(!disabled)
		.onStart(() => {
			context.value = { x: translateX.value, y: translateY.value };
			isDragging.value = true;
			scale.value = withSpring(1.1);
			zIndex.value = 100;
			runOnJS(handleDragStart)();
		})
		.onUpdate((event) => {
			translateX.value = context.value.x + event.translationX;
			translateY.value = context.value.y + event.translationY;
		})
		.onEnd((event) => {
			isDragging.value = false;
			scale.value = withSpring(1);
			zIndex.value = 1;

			runOnJS(handleDragEnd)(translateX.value, translateY.value);
		});

	const animatedStyle = useAnimatedStyle(() => {
		return {
			transform: [
				{ translateX: translateX.value },
				{ translateY: translateY.value },
				{ scale: scale.value },
			],
			zIndex: zIndex.value,
			shadowOpacity: withTiming(isDragging.value ? 0.3 : 0),
			shadowRadius: withTiming(isDragging.value ? 10 : 0),
			shadowOffset: { width: 0, height: withTiming(isDragging.value ? 5 : 0) },
			elevation: withTiming(isDragging.value ? 5 : 0),
		};
	});

	return (
		<GestureDetector gesture={panGesture}>
			<Animated.View style={[styles.container, style, animatedStyle]}>
				{children || (
					<View style={styles.defaultContent}>
						<Text style={styles.label}>{label}</Text>
					</View>
				)}
			</Animated.View>
		</GestureDetector>
	);
}

const styles = StyleSheet.create({
	container: {
		position: "absolute",
	},
	defaultContent: {
		backgroundColor: "white",
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: "#e5e7eb",
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 1,
		},
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2,
	},
	label: {
		fontSize: 16,
		fontWeight: "600",
		color: "#374151",
	},
});
