import { useRef, useMemo, useCallback, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useEditor, type EditorTab } from "./EditorProvider";
import { LayersPanel } from "./panels/LayersPanel";
import { PropertiesPanel } from "./panels/PropertiesPanel";
import { DebugPanel } from "./panels/DebugPanel";
import { AssetsPanel } from "./panels/AssetsPanel";
import { AssetGalleryPanel } from "./AssetGallery/AssetGalleryPanel";
import { ChatTimeline } from "@/components/create-game/ChatTimeline";
import { Composer } from "@/components/create-game/Composer";
import { ThreadList } from "@/components/create-game/ThreadList";
import { useCreateGameChat } from "@/components/create-game/useCreateGameChat";
import { useThreads } from "@/components/create-game/useThreads";


const TABS: { id: EditorTab; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "gallery", label: "Gallery" },
  { id: "assets", label: "Add" },
  { id: "properties", label: "Properties" },
  { id: "layers", label: "Layers" },
  { id: "debug", label: "Debug" },
];

export function BottomSheetHost() {
  const {
    mode,
    activeTab,
    setActiveTab,
    sheetSnapPoint,
    setSheetSnapPoint,
    selectedEntityId,
    gameId,
    threadId,
    setThreadId,
  } = useEditor();

  const sheetRef = useRef<BottomSheet>(null);

  const snapPoints = useMemo(() => ["12%", "50%", "90%"], []);

  const handleSheetChange = useCallback(
    (index: number) => {
      setSheetSnapPoint(index as 0 | 1 | 2);
    },
    [setSheetSnapPoint]
  );

  const effectiveGameId = gameId !== "preview" ? gameId : null;

  const { threads, createThread, initForGame, isLoading: isThreadsLoading } = useThreads();

  useEffect(() => {
    if (effectiveGameId) {
      initForGame(effectiveGameId);
    }
  }, [effectiveGameId, initForGame]);

  const {
    messages,
    sendMessage,
    isRunning,
    isSending,
    submitAnswer,
    submitUserAnswer,
    pendingQuestions,
  } = useCreateGameChat(threadId ?? null, effectiveGameId);

  useEffect(() => {
    if (activeTab === "chat" && sheetSnapPoint < 2) {
      setSheetSnapPoint(2);
      sheetRef.current?.snapToIndex(2);
    }
  }, [activeTab, sheetSnapPoint, setSheetSnapPoint]);

  const handleSendMessage = useCallback(
    (text: string) => {
      sendMessage(text, threadId ?? undefined, effectiveGameId ?? undefined);
    },
    [sendMessage, threadId, effectiveGameId]
  );

  if (mode === "playtest") {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={sheetSnapPoint}
      snapPoints={snapPoints}
      onChange={handleSheetChange}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      enablePanDownToClose={false}
    >
      <View style={styles.tabHeader}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDisabled = tab.id === "properties" && !selectedEntityId;

          return (
            <Pressable
              key={tab.id}
              style={[
                styles.tabButton,
                isActive && styles.tabButtonActive,
                isDisabled && styles.tabButtonDisabled,
              ]}
              onPress={() => !isDisabled && setActiveTab(tab.id)}
              disabled={isDisabled}
            >
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                  isDisabled && styles.tabLabelDisabled,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === "chat" ? (
        threadId ? (
          <View style={styles.chatContainer}>
            <Pressable onPress={() => setThreadId(null)} style={styles.backButton}>
              <Text style={styles.backButtonText}>All chats</Text>
            </Pressable>
            <ChatTimeline
              messages={messages}
              onSubmitUserAnswer={submitUserAnswer}
              onSubmitClarification={submitAnswer}
              onRetry={() => {}}
              isRunning={isRunning}
              hasPendingQuestion={!!pendingQuestions}
            />
            <Composer onSend={handleSendMessage} isSubmitting={isSending} />
          </View>
        ) : (
          <View style={styles.threadListContainer}>
            <ThreadList
              threads={threads}
              activeThreadId={null}
              onSelect={(id) => setThreadId(id)}
              onCreateNew={async () => {
                if (effectiveGameId) {
                  const newThreadId = await createThread(effectiveGameId);
                  setThreadId(newThreadId);
                }
              }}
              isLoading={isThreadsLoading}
            />
          </View>
        )
      ) : (
        <BottomSheetScrollView style={styles.content}>
          {activeTab === "gallery" && (
            <AssetGalleryPanel
              onTemplatePress={(templateId) => {
                console.log("Template pressed:", templateId);
              }}
            />
          )}
          {activeTab === "assets" && <AssetsPanel />}
          {activeTab === "properties" && <PropertiesPanel />}
          {activeTab === "layers" && <LayersPanel />}
          {activeTab === "debug" && <DebugPanel />}
        </BottomSheetScrollView>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "#1F2937",
  },
  handleIndicator: {
    backgroundColor: "#6B7280",
    width: 40,
  },
  tabHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
    paddingHorizontal: 8,
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#6366F1",
  },
  tabButtonDisabled: {
    opacity: 0.4,
  },
  tabLabel: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "500",
  },
  tabLabelActive: {
    color: "#FFFFFF",
  },
  tabLabelDisabled: {
    color: "#6B7280",
  },
  content: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
  },
  threadListContainer: {
    flex: 1,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  backButtonText: {
    color: "#6366F1",
    fontSize: 13,
    fontWeight: "500",
  },
});
