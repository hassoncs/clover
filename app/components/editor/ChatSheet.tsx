import { useRef, useMemo, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import BottomSheet, {
  BottomSheetFlatList,
  BottomSheetFooter,
  type BottomSheetFooterProps,
} from "@gorhom/bottom-sheet";
import { ChatMessage as ChatMessageComponent } from "@/components/create-game/ChatMessage";
import { Composer } from "@/components/create-game/Composer";
import { Ionicons } from "@expo/vector-icons";
import type { ChatMessage } from "@/components/create-game/types";

interface ChatSheetProps {
  visible: boolean;
  onDismiss: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isSending: boolean;
  isRunning: boolean;
  submitAnswer: (questionId: string, answer: string) => void;
  submitUserAnswer: (batchId: string, answers: string[][]) => void;
  pendingQuestions: any;
}

export function ChatSheet({
  visible,
  onDismiss,
  messages,
  onSendMessage,
  isSending,
  isRunning,
  submitAnswer,
  submitUserAnswer,
  pendingQuestions,
}: ChatSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["50%", "90%"], []);

  const reversedMessages = useMemo(
    () => [...messages].reverse(),
    [messages]
  );

  const renderChatMessage = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <View style={styles.chatMessageItem}>
        <ChatMessageComponent
          message={item}
          onSubmitUserAnswer={submitUserAnswer}
          onSubmitClarification={submitAnswer}
          onRetry={() => {}}
        />
      </View>
    ),
    [submitUserAnswer, submitAnswer]
  );

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props}>
        <View style={styles.footerContainer}>
          <Composer variant="sheet" onSend={onSendMessage} isSubmitting={isSending} />
        </View>
      </BottomSheetFooter>
    ),
    [onSendMessage, isSending]
  );

  const renderHandle = useCallback(
    () => (
      <View style={styles.handleContainer}>
        <View style={styles.handleIndicator} />
        <View style={styles.headerRow}>
          <Pressable onPress={onDismiss} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close chat">
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Edit</Text>
          <View style={styles.closeButton} />
        </View>
      </View>
    ),
    [onDismiss]
  );

  if (!visible) return null;

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      backgroundStyle={styles.sheetBackground}
      handleComponent={renderHandle}
      enablePanDownToClose
      onClose={onDismiss}
      enableDynamicSizing={false}
      footerComponent={renderFooter}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <BottomSheetFlatList<ChatMessage>
        data={reversedMessages}
        keyExtractor={(item: ChatMessage) => item.id}
        renderItem={renderChatMessage}
        inverted
        contentContainerStyle={styles.chatContentContainer}
        ListHeaderComponent={
          isRunning && !pendingQuestions ? (
            <View style={styles.typingContainer}>
              <Text style={styles.typingText}>Building your game...</Text>
            </View>
          ) : null
        }
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "#1F2937",
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: "#1F2937",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#6B7280",
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    width: "100%",
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  chatContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  chatMessageItem: {
    marginBottom: 4,
  },
  footerContainer: {
    backgroundColor: "#1F2937",
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    alignSelf: "flex-start",
  },
  typingText: {
    fontSize: 13,
    color: "#71717A",
  },
});
