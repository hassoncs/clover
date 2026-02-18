import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	Text,
	TextInput,
	View,
} from "react-native";

export function AnswerInput({
	onSubmit,
	disabled,
}: {
	onSubmit: (answer: string) => void;
	disabled?: boolean;
}) {
	const [answer, setAnswer] = useState("");

	const handleSubmit = () => {
		if (!answer.trim()) return;
		onSubmit(answer.trim());
		setAnswer("");
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			className="w-full"
		>
			<View className="w-full gap-3">
				<TextInput
					value={answer}
					onChangeText={setAnswer}
					placeholder="Type your answer..."
					placeholderTextColor="#666"
					multiline
					maxLength={140}
					editable={!disabled}
					className="w-full bg-theme-surface text-theme-text p-4 rounded-xl text-lg border border-theme-border min-h-[100px] text-top"
					style={{ textAlignVertical: "top" }}
				/>
				<Pressable
					onPress={handleSubmit}
					disabled={!answer.trim() || disabled}
					className={`w-full bg-theme-primary p-4 rounded-xl items-center flex-row justify-center gap-2 active:opacity-90 ${!answer.trim() || disabled ? "opacity-50" : ""}`}
				>
					<Text className="text-white text-lg font-bold">Submit Answer</Text>
					<Ionicons name="send" size={20} color="white" />
				</Pressable>
			</View>
		</KeyboardAvoidingView>
	);
}
