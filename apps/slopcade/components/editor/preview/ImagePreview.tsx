import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
	ActivityIndicator,
	Dimensions,
	Image,
	StyleSheet,
	Text,
	View,
} from "react-native";
import {
	Gesture,
	GestureDetector,
	GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";
import { getAssetUrl } from "./utils";

interface ImagePreviewProps {
	filename: string;
}

export function ImagePreview({ filename }: ImagePreviewProps) {
	const [isLoading, setIsLoading] = React.useState(true);
	const [error, setError] = React.useState<boolean>(false);
	const [imageSize, setImageSize] = React.useState<{
		width: number;
		height: number;
	} | null>(null);

	const scale = useSharedValue(1);
	const savedScale = useSharedValue(1);
	const translateX = useSharedValue(0);
	const translateY = useSharedValue(0);
	const savedTranslateX = useSharedValue(0);
	const savedTranslateY = useSharedValue(0);

	const uri = getAssetUrl(filename);

	React.useEffect(() => {
		scale.value = 1;
		savedScale.value = 1;
		translateX.value = 0;
		translateY.value = 0;
		savedTranslateX.value = 0;
		savedTranslateY.value = 0;

		setIsLoading(true);
		setError(false);

		Image.getSize(
			uri,
			(width, height) => {
				setImageSize({ width, height });
				setIsLoading(false);
			},
			(err) => {
				console.error("Failed to get image size", err);
				setError(true);
				setIsLoading(false);
			},
		);
	}, [
		filename,
		uri,
		scale,
		savedScale,
		translateX,
		translateY,
		savedTranslateX,
		savedTranslateY,
	]);

	const panGesture = Gesture.Pan()
		.onUpdate((e) => {
			translateX.value = savedTranslateX.value + e.translationX;
			translateY.value = savedTranslateY.value + e.translationY;
		})
		.onEnd(() => {
			savedTranslateX.value = translateX.value;
			savedTranslateY.value = translateY.value;
		});

	const pinchGesture = Gesture.Pinch()
		.onUpdate((e) => {
			scale.value = savedScale.value * e.scale;
		})
		.onEnd(() => {
			if (scale.value < 1) {
				scale.value = withSpring(1);
				savedScale.value = 1;
			} else {
				savedScale.value = scale.value;
			}
		});

	const doubleTapGesture = Gesture.Tap()
		.numberOfTaps(2)
		.onEnd(() => {
			if (scale.value !== 1) {
				scale.value = withSpring(1);
				savedScale.value = 1;
				translateX.value = withSpring(0);
				translateY.value = withSpring(0);
				savedTranslateX.value = 0;
				savedTranslateY.value = 0;
			} else {
				scale.value = withSpring(2);
				savedScale.value = 2;
			}
		});

	const composed = Gesture.Simultaneous(panGesture, pinchGesture);
	const gesture = Gesture.Race(doubleTapGesture, composed);

	const animatedStyle = useAnimatedStyle(() => {
		return {
			transform: [
				{ translateX: translateX.value },
				{ translateY: translateY.value },
				{ scale: scale.value },
			],
		};
	});

	if (error) {
		return (
			<View style={styles.container}>
				<Ionicons name="image-outline" size={48} color="#EF4444" />
				<Text style={styles.errorText}>Failed to load image</Text>
				<Text style={styles.filename}>{filename}</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<GestureHandlerRootView style={styles.gestureContainer}>
				<GestureDetector gesture={gesture}>
					<View style={styles.imageContainer}>
						{isLoading && (
							<ActivityIndicator
								size="large"
								color="#6366F1"
								style={StyleSheet.absoluteFill}
							/>
						)}
						<Animated.Image
							source={{ uri }}
							style={[styles.image, animatedStyle]}
							resizeMode="contain"
							onLoadEnd={() => setIsLoading(false)}
						/>
					</View>
				</GestureDetector>
			</GestureHandlerRootView>

			<View style={styles.footer}>
				<Text style={styles.filename}>{filename.split("/").pop()}</Text>
				{imageSize && (
					<Text style={styles.dimensions}>
						{imageSize.width} x {imageSize.height}
					</Text>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#1F2937",
		overflow: "hidden",
	},
	gestureContainer: {
		flex: 1,
	},
	imageContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	image: {
		width: "100%",
		height: "100%",
	},
	footer: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: "rgba(17, 24, 39, 0.8)",
		padding: 12,
		alignItems: "center",
		borderTopWidth: 1,
		borderTopColor: "#374151",
	},
	errorText: {
		color: "#EF4444",
		fontSize: 16,
		marginTop: 16,
		marginBottom: 8,
	},
	filename: {
		color: "#F3F4F6",
		fontSize: 14,
		fontWeight: "600",
	},
	dimensions: {
		color: "#9CA3AF",
		fontSize: 12,
		marginTop: 4,
	},
});
