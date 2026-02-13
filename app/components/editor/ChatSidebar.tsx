import { Platform, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { ChatConversation } from "@/components/create-game/ChatConversation";
import { useTheme } from "@/lib/theme";
import { useEditorChatSession } from "./useEditorChatSession";

const isWeb = Platform.OS === "web";

interface ChatSidebarProps {
	style?: ViewStyle;
}

export function ChatSidebar({ style }: ChatSidebarProps) {
	const { editorColors: c } = useTheme();
	const {
		messages,
		handleSendMessage,
		isRunning,
		isSending,
		submitAnswer,
		submitUserAnswer,
		pendingQuestions,
	} = useEditorChatSession();

	return (
		<View style={[styles.container, { backgroundColor: c.panelBg }, style]}>
			{!isWeb && (
				<View style={[styles.header, { borderBottomColor: c.border }]}>
					<Text style={[styles.headerTitle, { color: c.text }]}>Chat</Text>
				</View>
			)}
			<ChatConversation
				messages={messages}
				onSendMessage={handleSendMessage}
				isSending={isSending}
				isRunning={isRunning}
				onSubmitClarification={submitAnswer}
				onSubmitUserAnswer={submitUserAnswer}
				pendingQuestions={pendingQuestions}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
	},
	headerTitle: {
		fontSize: 14,
		fontWeight: "600",
	},
});
