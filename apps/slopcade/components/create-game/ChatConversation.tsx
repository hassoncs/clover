import type { ChatMessage } from "@slopcade/shared/chat";
import type React from "react";
import { StyleSheet, View } from "react-native";
import { ChatMessageList } from "./ChatMessageList";
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
