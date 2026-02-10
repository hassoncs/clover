import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCreateGameChat } from "@/components/create-game/useCreateGameChat";
import { ChatTimeline } from "@/components/create-game/ChatTimeline";
import { Composer } from "@/components/create-game/Composer";
import { SharedDocumentPanel } from "@/components/create-game/SharedDocumentPanel";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function CreateGameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { messages, sendMessage, cancelBuild, resetSession, submitAnswer, submitUserAnswer, run, isRunning, documentContent } = useCreateGameChat();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasNavigated = useRef(false);
  const lastPromptRef = useRef<string>('');

  const handleNewChat = useCallback(() => {
    resetSession();
    hasNavigated.current = false;
    lastPromptRef.current = '';
  }, [resetSession]);

  const hasPendingQuestion = messages.some(m => m.pending === true);

  useEffect(() => {
    if (run?.status === 'succeeded' && run.gameId && !hasNavigated.current) {
      hasNavigated.current = true;
      const timer = setTimeout(() => {
        router.replace(`/editor/${run.gameId}`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [run?.status, run?.gameId, router]);

  const handleDismiss = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/browse");
    }
  }, [router]);

  const handleSend = async (text: string) => {
    lastPromptRef.current = text;
    setIsSubmitting(true);
    try {
      await sendMessage(text);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    if (lastPromptRef.current) {
      handleSend(lastPromptRef.current);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Game</Text>
        <View style={styles.headerActions}>
          {!isRunning && messages.length > 0 && (
            <Pressable
              onPress={handleNewChat}
              style={styles.newChatButton}
              accessibilityRole="button"
              accessibilityLabel="Start new chat"
            >
              <Ionicons name="add-circle-outline" size={18} color="#60A5FA" />
              <Text style={styles.newChatButtonText}>New</Text>
            </Pressable>
          )}
          {isRunning && (
            <Pressable
              onPress={cancelBuild}
              style={styles.cancelButton}
              accessibilityRole="button"
              accessibilityLabel="Cancel build"
            >
              <Ionicons name="stop-circle-outline" size={18} color="#F87171" />
              <Text style={styles.cancelButtonText}>Stop</Text>
            </Pressable>
          )}
          <Pressable
            onPress={handleDismiss}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={24} color="#A1A1AA" />
          </Pressable>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.chatContainer}>
          <KeyboardAvoidingView 
            style={styles.keyboardAvoiding}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <ErrorBoundary>
              <ChatTimeline 
                messages={messages} 
                onSubmitUserAnswer={submitUserAnswer}
                onSubmitClarification={submitAnswer}
                onRetry={handleRetry}
                isRunning={isRunning}
                hasPendingQuestion={hasPendingQuestion}
              />
            </ErrorBoundary>
            <View style={{ paddingBottom: insets.bottom }}>
              <Composer onSend={handleSend} isSubmitting={isSubmitting} />
            </View>
          </KeyboardAvoidingView>
        </View>

        {Platform.OS === 'web' && (
          <SharedDocumentPanel content={documentContent} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0B0E",
  },
  contentContainer: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
  },
  chatContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
    zIndex: 10,
    backgroundColor: "#0A0B0E",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  newChatButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "rgba(96,165,250,0.12)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  newChatButtonText: {
    color: "#60A5FA",
    fontSize: 13,
    fontWeight: "600" as const,
  },
  cancelButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "rgba(248,113,113,0.12)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelButtonText: {
    color: "#F87171",
    fontSize: 13,
    fontWeight: "600" as const,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  keyboardAvoiding: {
    flex: 1,
  },
});
