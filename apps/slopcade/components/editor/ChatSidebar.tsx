import { useEffect, useRef } from "react";
import {
	Animated,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	View,
	type ViewStyle,
} from "react-native";
import { ChatConversation } from "@/components/create-game/ChatConversation";
import { useTheme } from "@/lib/theme";
import { useEditor } from "./EditorProvider";
import { useEditorChatSession } from "./useEditorChatSession";

const isWeb = Platform.OS === "web";

function ChatErrorBanner({ message }: { message: string }) {
	const opacity = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.timing(opacity, {
			toValue: 1,
			duration: 200,
			useNativeDriver: true,
		}).start();
	}, [opacity]);

	return (
		<Animated.View style={[styles.errorBanner, { opacity }]}>
			<Text style={styles.errorText} numberOfLines={3}>
				{message}
			</Text>
		</Animated.View>
	);
}

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
		error,
	} = useEditorChatSession();
	const { designPhase } = useEditor();

	return (
		<View
			style={[styles.container, { backgroundColor: c.panelBg }, style]}
			accessibilityLabel="Chat"
			testID="editor-chat-panel"
		>
			{!isWeb && (
				<View style={[styles.header, { borderBottomColor: c.border }]}>
					<Text style={[styles.headerTitle, { color: c.text }]}>Chat</Text>
				</View>
			)}
			{designPhase !== "idle" && (
				<View
					style={[
						styles.phaseBanner,
						{ backgroundColor: c.surfaceHover, borderBottomColor: c.border },
					]}
				>
					<Text style={[styles.phaseBannerText, { color: c.textSecondary }]}>
						Phase: {designPhase.toUpperCase()}
					</Text>
				</View>
			)}
			{error && <ChatErrorBanner message={error} />}
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
		height: "100%",
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
	errorBanner: {
		backgroundColor: "rgba(239, 68, 68, 0.15)",
		borderBottomWidth: 1,
		borderBottomColor: "rgba(239, 68, 68, 0.3)",
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	errorText: {
		color: "#F87171",
		fontSize: 12,
		lineHeight: 16,
	},
	phaseBanner: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderBottomWidth: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
	},
	phaseBannerText: {
		fontSize: 11,
		fontWeight: "600",
		letterSpacing: 0.5,
	},
});
