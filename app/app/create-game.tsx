import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCreateGameChat } from "@/components/create-game/useCreateGameChat";
import { ChatTimeline } from "@/components/create-game/ChatTimeline";
import { Composer } from "@/components/create-game/Composer";

export default function CreateGameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { messages, sendMessage, submitAnswer, submitUserAnswer, run, isRunning } = useCreateGameChat();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasNavigated = useRef(false);
  const lastPromptRef = useRef<string>('');

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
        <Pressable
          onPress={handleDismiss}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color="#A1A1AA" />
        </Pressable>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ChatTimeline 
          messages={messages} 
          onSubmitUserAnswer={submitUserAnswer}
          onSubmitClarification={submitAnswer}
          onRetry={handleRetry}
          isRunning={isRunning}
          hasPendingQuestion={hasPendingQuestion}
        />
        <View style={{ paddingBottom: insets.bottom }}>
          <Composer onSend={handleSend} isSubmitting={isSubmitting} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0B0E",
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
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  keyboardAvoiding: {
    flex: 1,
  },
});
