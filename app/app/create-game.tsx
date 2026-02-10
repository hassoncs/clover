import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCreateGameChat } from "@/components/create-game/useCreateGameChat";
import { useThreads } from "@/components/create-game/useThreads";
import { ThreadList } from "@/components/create-game/ThreadList";
import { ChatTimeline } from "@/components/create-game/ChatTimeline";
import { Composer } from "@/components/create-game/Composer";
import { SharedDocumentPanel } from "@/components/create-game/SharedDocumentPanel";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { trpcReact as trpc } from "@/lib/trpc/react";

const MINIMAL_GAME_DEF = JSON.stringify({
  metadata: { title: "New Game", description: "Work in progress" },
  entities: {},
  scenes: { main: { entities: [] } },
  globalVariables: {},
  rules: []
});

export default function CreateGameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { 
    threads, 
    activeThreadId, 
    gameId, 
    isLoading: isThreadsLoading, 
    createThread, 
    selectThread, 
    initForGame 
  } = useThreads();

  const { 
    messages, 
    sendMessage, 
    cancelBuild, 
    resetSession, 
    submitAnswer, 
    submitUserAnswer, 
    run, 
    isRunning, 
    documentContent,
    pendingQuestions 
  } = useCreateGameChat(activeThreadId, gameId);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasNavigated = useRef(false);
  const lastPromptRef = useRef<string>('');

  const createGameMutation = trpc.games.create.useMutation();

  const handleNewThread = useCallback(async () => {
    if (gameId) {
      await createThread(gameId);
    } else {
      resetSession();
    }
    hasNavigated.current = false;
    lastPromptRef.current = '';
  }, [gameId, createThread, resetSession]);

  const hasPendingQuestion = !!pendingQuestions;

  useEffect(() => {
    if (run?.status === 'succeeded' && run.gameId && !hasNavigated.current) {
      
    }
  }, [run?.status, run?.gameId]);

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
      let targetGameId = gameId;
      let targetThreadId = activeThreadId;

      if (!targetGameId) {
        const game = await createGameMutation.mutateAsync({
          title: "New Game",
          definition: MINIMAL_GAME_DEF,
          isPublic: false
        });
        targetGameId = game.id;
        initForGame(targetGameId);
      }

      if (!targetThreadId && targetGameId) {
        targetThreadId = await createThread(targetGameId);
      }

      if (targetThreadId && targetGameId) {
        await sendMessage(text, targetThreadId, targetGameId);
      }
    } catch (e) {
      console.error("Failed to send message:", e);
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
        {Platform.OS === 'web' && (
          <ThreadList
            threads={threads}
            activeThreadId={activeThreadId}
            onSelect={selectThread}
            onCreateNew={handleNewThread}
            isLoading={isThreadsLoading}
          />
        )}
        
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
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderRightColor: 'rgba(255,255,255,0.08)',
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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(248,113,113,0.12)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelButtonText: {
    color: "#F87171",
    fontSize: 13,
    fontWeight: "600",
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
