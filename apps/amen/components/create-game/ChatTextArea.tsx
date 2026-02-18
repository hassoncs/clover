import { Ionicons } from "@expo/vector-icons";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	ActivityIndicator,
	Animated,
	type NativeSyntheticEvent,
	Platform,
	Pressable,
	StyleSheet,
	TextInput,
	type TextInputContentSizeChangeEventData,
	type TextInputKeyPressEventData,
	View,
} from "react-native";
import { MicButton } from "@/components/ui/MicButton";
import { useSpeechToText } from "@/lib/speech/useSpeechToText";

const MIN_INPUT_HEIGHT = 40;
const MAX_INPUT_HEIGHT = Platform.OS === "web" ? 300 : 120;

interface Props {
	onSend: (text: string) => void;
	isSubmitting: boolean;
	variant?: "toolbar" | "sheet";
	enableSpeechToText?: boolean;
}

export function ChatTextArea({
	onSend,
	isSubmitting,
	variant = "toolbar",
	enableSpeechToText = false,
}: Props) {
	const [text, setText] = useState("");
	const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);

	const {
		transcript,
		volumeLevel,
		isRecording,
		isConnecting,
		error,
		startRecording,
		stopRecording,
	} = useSpeechToText({
		mode: "toggle",
		onTranscriptComplete: (transcribedText) => {
			setText((prev) => prev + transcribedText);
		},
	});

	const borderAnim = useRef(new Animated.Value(0)).current;
	const volumeRef = useRef(volumeLevel);
	volumeRef.current = volumeLevel;
	const currentBorder = useRef(0);
	const frameRef = useRef<number | null>(null);

	useEffect(() => {
		if (!isRecording) {
			borderAnim.setValue(0);
			currentBorder.current = 0;
			return;
		}

		const animate = () => {
			const normalized = Math.min(
				1,
				Math.max(0, (volumeRef.current - 0.01) / 0.14) ** 0.5,
			);
			currentBorder.current += (normalized - currentBorder.current) * 0.2;
			borderAnim.setValue(currentBorder.current);
			frameRef.current = requestAnimationFrame(animate);
		};

		frameRef.current = requestAnimationFrame(animate);

		return () => {
			if (frameRef.current !== null) {
				cancelAnimationFrame(frameRef.current);
				frameRef.current = null;
			}
		};
	}, [isRecording, borderAnim]);

	const inputBorderColor = useMemo(
		() =>
			borderAnim.interpolate({
				inputRange: [0, 1],
				outputRange: ["rgba(239, 68, 68, 0.15)", "rgba(239, 68, 68, 0.8)"],
			}),
		[borderAnim],
	);

	const handleSend = useCallback(() => {
		if (!text.trim() || isSubmitting) return;
		onSend(text.trim());
		setText("");
		setInputHeight(MIN_INPUT_HEIGHT);
	}, [text, isSubmitting, onSend]);

	const handleContentSizeChange = useCallback(
		(e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
			const contentHeight = e.nativeEvent.contentSize.height;
			const clamped = Math.min(
				Math.max(contentHeight, MIN_INPUT_HEIGHT),
				MAX_INPUT_HEIGHT,
			);
			setInputHeight(clamped);
		},
		[],
	);

	const handleChangeText = useCallback((newText: string) => {
		setText(newText);
	}, []);

	const handleKeyPress = useCallback(
		(e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
			if (Platform.OS !== "web") return;
			const nativeEvent = e.nativeEvent as TextInputKeyPressEventData & {
				shiftKey?: boolean;
			};
			if (nativeEvent.key === "Enter" && !nativeEvent.shiftKey) {
				e.preventDefault();
				handleSend();
			}
		},
		[handleSend],
	);

	const isDisabled = !text.trim() || isSubmitting;

	// BottomSheetTextInput crashes on web (findNodeHandle._scrollRef null during unmount)
	// Only use it on native where it's needed for keyboard handling inside bottom sheets
	const InputComponent =
		variant === "sheet" && Platform.OS !== "web"
			? BottomSheetTextInput
			: TextInput;

	const displayValue = isRecording ? text + transcript : text;

	return (
		<View style={styles.container}>
			<Animated.View
				style={[
					styles.inputWrapper,
					isRecording && {
						borderColor: inputBorderColor,
						borderWidth: 1.5,
					},
				]}
			>
				<InputComponent
					testID="composer-input"
					style={[
						styles.input,
						{ height: inputHeight },
						isRecording && styles.inputRecording,
					]}
					value={displayValue}
					onChangeText={handleChangeText}
					placeholder={isRecording ? "Listening..." : "Make an edit..."}
					placeholderTextColor="#71717A"
					multiline
					maxLength={1000}
					onKeyPress={handleKeyPress}
					onContentSizeChange={handleContentSizeChange}
					blurOnSubmit={false}
					accessibilityLabel="Message input"
				/>
			</Animated.View>
			{enableSpeechToText && (
				<View style={styles.micButtonContainer}>
					<MicButton
						isRecording={isRecording}
						isConnecting={isConnecting}
						error={error}
						volumeLevel={volumeLevel}
						onPress={startRecording}
						mode="toggle"
					/>
				</View>
			)}
			<Pressable
				testID="composer-send-button"
				onPress={handleSend}
				disabled={isDisabled}
				style={[styles.sendButton, isDisabled && styles.sendButtonDisabled]}
				accessibilityRole="button"
				accessibilityLabel="Send message"
				accessibilityState={{ disabled: isDisabled }}
			>
				{isSubmitting ? (
					<ActivityIndicator size="small" color="#A1A1AA" />
				) : (
					<Ionicons
						name="arrow-up-circle"
						size={32}
						color={isDisabled ? "#3F3F46" : "#2563EB"}
					/>
				)}
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "flex-end",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderTopWidth: 1,
		borderTopColor: "rgba(255,255,255,0.1)",
		backgroundColor: "#0A0B0E",
	},
	inputWrapper: {
		flex: 1,
		borderRadius: 20,
		marginRight: 12,
		borderWidth: 1.5,
		borderColor: "transparent",
	},
	input: {
		backgroundColor: "rgba(255,255,255,0.08)",
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingTop: 10,
		paddingBottom: 10,
		color: "#FFFFFF",
		fontSize: 16,
	},
	inputRecording: {
		backgroundColor: "rgba(239, 68, 68, 0.05)",
	},
	micButtonContainer: {
		marginRight: 8,
		marginBottom: 4,
	},
	sendButton: {
		width: 32,
		height: 32,
		marginBottom: 4,
		justifyContent: "center",
		alignItems: "center",
	},
	sendButtonDisabled: {
		opacity: 0.8,
	},
});
