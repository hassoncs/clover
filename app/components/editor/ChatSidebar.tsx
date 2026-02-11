import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { ChatConversation } from "@/components/create-game/ChatConversation";
import { useEditorChatSession } from "./useEditorChatSession";

interface ChatSidebarProps {
  style?: ViewStyle;
}

export function ChatSidebar({ style }: ChatSidebarProps) {
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
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
      </View>
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
    backgroundColor: "#1F2937",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
