import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { MicButton } from "@/components/ui/MicButton";
import { useSpeechToText } from "@/lib/speech/useSpeechToText";

interface MicInputProps {
	onSubmit: (data: { transcript: string }) => void;
	timeLimit?: number;
	prompt?: string;
	maxDuration?: number;
	disabled?: boolean;
}

export function MicInput({
	onSubmit,
	timeLimit,
	prompt,
	maxDuration = 30000, // Default 30s
	disabled,
}: MicInputProps) {
	const [submitted, setSubmitted] = useState(false);

	const {
		transcript,
		volumeLevel,
		isRecording,
		isConnecting,
		error,
		startRecording,
		stopRecording,
		resetTranscript,
	} = useSpeechToText({
		mode: "toggle",
		maxDuration,
	});

	// Auto-submit on time limit
	useEffect(() => {
		if (timeLimit && timeLimit > 0) {
			const timer = setTimeout(() => {
				if (!submitted && transcript.trim()) {
					setSubmitted(true);
					stopRecording();
					onSubmit({ transcript: transcript.trim() });
				}
			}, timeLimit * 1000);
			return () => clearTimeout(timer);
		}
	}, [timeLimit, transcript, submitted, onSubmit, stopRecording]);

	const handleToggleRecording = () => {
		if (disabled || submitted) return;
		if (isRecording) {
			stopRecording();
		} else {
			startRecording();
		}
	};

	const handleSubmit = () => {
		if (submitted) return;
		if (!transcript.trim()) return;

		setSubmitted(true);
		stopRecording();
		onSubmit({ transcript: transcript.trim() });
	};

	const handleClear = () => {
		if (disabled || submitted) return;
		resetTranscript();
	};

	return (
		<View className="flex-1 w-full items-center justify-center gap-8 p-4">
			{prompt && (
				<Text className="text-2xl font-bold text-theme-text text-center px-4">
					{prompt}
				</Text>
			)}

			<View className="w-full max-w-md min-h-[120px] bg-theme-surface/50 rounded-2xl p-6 items-center justify-center border-2 border-theme-border/50">
				{transcript ? (
					<Text className="text-xl text-theme-text text-center font-medium leading-relaxed">
						{transcript}
					</Text>
				) : (
					<Text className="text-lg text-theme-text-tertiary text-center italic">
						{isRecording ? "Listening..." : "Tap the mic to start speaking"}
					</Text>
				)}
			</View>

			<View className="items-center gap-6">
				<View className="scale-125">
					<MicButton
						mode="toggle"
						isRecording={isRecording}
						isConnecting={isConnecting}
						error={error}
						volumeLevel={volumeLevel}
						onPress={handleToggleRecording}
					/>
				</View>

				{error && (
					<View className="bg-theme-error/10 px-4 py-2 rounded-lg">
						<Text className="text-theme-error text-sm text-center font-medium">
							{error.message}
						</Text>
					</View>
				)}
			</View>

			{transcript.length > 0 && (
				<View className="flex-row gap-4 mt-4">
					{!submitted && (
						<Pressable
							onPress={handleClear}
							disabled={disabled || isRecording}
							className={`w-14 h-14 rounded-full bg-theme-surface-elevated items-center justify-center active:bg-theme-surface ${
								disabled || isRecording ? "opacity-50" : ""
							}`}
						>
							<Ionicons name="refresh" size={24} color="#FDF8F0" />
						</Pressable>
					)}

					<Pressable
						onPress={handleSubmit}
						disabled={disabled || submitted}
						className={`h-14 px-8 rounded-full flex-row items-center gap-2 ${
							submitted
								? "bg-theme-success"
								: disabled
									? "bg-theme-surface-elevated"
									: "bg-theme-primary active:bg-theme-primary/90"
						}`}
					>
						<Text
							className={`font-bold text-lg ${submitted ? "text-theme-text-inverse" : "text-theme-secondary"}`}
						>
							{submitted ? "Sent!" : "Submit Answer"}
						</Text>
						{!submitted && (
							<Ionicons name="arrow-forward" size={20} color="#1B3A6B" />
						)}
					</Pressable>
				</View>
			)}
		</View>
	);
}
