import type { ChatMessage } from "@slopcade/shared/chat";
import type React from "react";
import { StyleSheet, View } from "react-native";
import { ChatMessageList } from "./ChatMessageList";
import type { SpeechToTextHookResult } from "./ChatTextArea";
import { ChatTextArea } from "./ChatTextArea";

interface ChatConversationProps {
	messages: ChatMessage[];
	onSendMessage: (text: string) => void;
	isSending: boolean;
	isRunning?: boolean;
	onSubmitUserAnswer?: (batchId: string, answers: string[][]) => void;
	onSubmitClarification?: (questionId: string, answer: string) => void;
	onRetry?: () => void;
	pendingQuestions?: unknown;
	listComponent?: React.ElementType;
	textInputVariant?: "toolbar" | "sheet";
	useSpeechToText?: (config: {
		mode: "toggle" | "hold";
		onTranscriptComplete?: (transcript: string) => void;
	}) => SpeechToTextHookResult;
}

export function ChatConversation({
	messages,
	onSendMessage,
	isSending,
	isRunning,
	onSubmitUserAnswer,
	onSubmitClarification,
	onRetry,
	pendingQuestions,
	listComponent,
	textInputVariant = "toolbar",
	useSpeechToText,
}: ChatConversationProps) {
	return (
		<View style={styles.container}>
			<ChatMessageList
				messages={messages}
				onSubmitUserAnswer={onSubmitUserAnswer}
				onSubmitClarification={onSubmitClarification}
				onRetry={onRetry}
				isRunning={isRunning}
				hasPendingQuestion={!!pendingQuestions}
				listComponent={listComponent}
			/>
			<ChatTextArea
				onSend={onSendMessage}
				isSubmitting={isSending}
				variant={textInputVariant}
				enableSpeechToText
				useSpeechToText={useSpeechToText}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#1F2937",
	},
});
