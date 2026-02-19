import { Ionicons } from "@expo/vector-icons";
import { tokens } from "@slopcade/theme";
import { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, Animated, Pressable, StyleSheet } from "react-native";

interface SpeechToTextError {
	code: string;
	message: string;
}

const ENERGY_MIN = 0.01;
const ENERGY_MAX = 0.15;
const ENERGY_CURVE = 0.5;

function normalizeVolume(raw: number): number {
	const clamped = Math.max(0, (raw - ENERGY_MIN) / (ENERGY_MAX - ENERGY_MIN));
	return Math.min(1, clamped ** ENERGY_CURVE);
}

interface MicButtonProps {
	isRecording: boolean;
	isConnecting: boolean;
	error: SpeechToTextError | null;
	volumeLevel?: number;
	onPress?: () => void;
	onPressIn?: () => void;
	onPressOut?: () => void;
	mode: "toggle" | "hold";
}

export function MicButton({
	isRecording,
	isConnecting,
	error,
	volumeLevel = 0,
	onPress,
	onPressIn,
	onPressOut,
	mode,
}: MicButtonProps) {
	const opacityAnim = useRef(new Animated.Value(1)).current;
	const scaleAnim = useRef(new Animated.Value(1)).current;
	const volumeRef = useRef(volumeLevel);
	volumeRef.current = volumeLevel;
	const frameRef = useRef<number | null>(null);
	const currentOpacity = useRef(1);
	const currentScale = useRef(1);

	useEffect(() => {
		if (error) {
			console.warn("[MicButton] Speech error:", error.code, error.message);
		}
	}, [error]);

	useEffect(() => {
		if (!isRecording) {
			opacityAnim.setValue(1);
			scaleAnim.setValue(1);
			currentOpacity.current = 1;
			currentScale.current = 1;
			return;
		}

		const animate = () => {
			const normalized = normalizeVolume(volumeRef.current);

			const targetOpacity = 0.4 + normalized * 0.6;
			const targetScale = 1 + normalized * 0.15;

			currentOpacity.current += (targetOpacity - currentOpacity.current) * 0.2;
			currentScale.current += (targetScale - currentScale.current) * 0.2;

			opacityAnim.setValue(currentOpacity.current);
			scaleAnim.setValue(currentScale.current);

			frameRef.current = requestAnimationFrame(animate);
		};

		frameRef.current = requestAnimationFrame(animate);

		return () => {
			if (frameRef.current !== null) {
				cancelAnimationFrame(frameRef.current);
				frameRef.current = null;
			}
		};
	}, [isRecording, opacityAnim, scaleAnim]);

	const animatedStyle = useMemo(
		() =>
			isRecording
				? { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }
				: undefined,
		[isRecording, opacityAnim, scaleAnim],
	);

	return (
		<Animated.View style={animatedStyle}>
			<Pressable
				onPress={mode === "toggle" ? onPress : undefined}
				onPressIn={mode === "hold" ? onPressIn : undefined}
				onPressOut={mode === "hold" ? onPressOut : undefined}
				style={[styles.button, isRecording && styles.buttonRecording]}
				accessibilityLabel={isRecording ? "Stop recording" : "Start recording"}
				accessibilityRole="button"
				accessibilityState={{ selected: isRecording }}
				testID="mic-button"
			>
				{isConnecting ? (
					<ActivityIndicator
						size="small"
						color={tokens.colors.text.secondary}
						testID="loading-indicator"
					/>
				) : (
					<Ionicons
						name={isRecording ? "mic" : "mic-outline"}
						size={24}
						color={
							isRecording ? tokens.colors.error : tokens.colors.text.secondary
						}
						testID="mic-icon"
					/>
				)}
			</Pressable>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	button: {
		padding: 8,
		borderRadius: 9999,
	},
	buttonRecording: {
		backgroundColor: "rgba(239, 68, 68, 0.15)",
	},
});
