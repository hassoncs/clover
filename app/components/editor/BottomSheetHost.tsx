import { useRef, useMemo, useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import BottomSheet, {
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetFlatList,
  BottomSheetFooter,
  type BottomSheetFooterProps,
} from "@gorhom/bottom-sheet";
import { useEditor, type EditorTab } from "./EditorProvider";
import { LayersPanel } from "./panels/LayersPanel";
import { PropertiesPanel } from "./panels/PropertiesPanel";
import { DebugPanel } from "./panels/DebugPanel";
import { AssetsPanel } from "./panels/AssetsPanel";
import { AssetGalleryPanel } from "./AssetGallery/AssetGalleryPanel";
import { ChatMessage as ChatMessageComponent } from "@/components/create-game/ChatMessage";
import { Composer } from "@/components/create-game/Composer";
import { useCreateGameChat } from "@/components/create-game/useCreateGameChat";
import { useThreads } from "@/components/create-game/useThreads";
import type { ChatMessage } from "@/components/create-game/types";

const TOOL_TABS: { id: EditorTab; label: string }[] = [
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
  } = useEditor();

  const sheetRef = useRef<BottomSheet>(null);

  const effectiveGameId = gameId !== "preview" ? gameId : null;
  const { threads, createThread, initForGame } = useThreads();
  const [threadId, setThreadId] = useState<string | null>(null);

  useEffect(() => {
    if (effectiveGameId) {
      initForGame(effectiveGameId);
    }
  }, [effectiveGameId, initForGame]);

  useEffect(() => {
    if (!threadId && threads.length > 0) {
      setThreadId(threads[0].id);
    }
  }, [threads, threadId]);

  const {
    messages,
    sendMessage,
    isRunning,
    isSending,
    submitAnswer,
    submitUserAnswer,
    pendingQuestions,
  } = useCreateGameChat(threadId, effectiveGameId);

  const isChatMode = activeTab === "chat";
  const hasMessages = messages.length > 0;

  const tabs = useMemo(() => {
    if (hasMessages || isChatMode) {
      return [...TOOL_TABS, { id: "chat" as EditorTab, label: "Chat" }];
    }
    return TOOL_TABS;
  }, [hasMessages, isChatMode]);

  const toolSnapPoints = useMemo(() => ["12%", "50%", "90%"], []);
  const chatSnapPoints = useMemo(() => ["50%", "90%"], []);

  const handleSheetChange = useCallback(
    (index: number) => {
      setSheetSnapPoint(index as 0 | 1 | 2);
    },
    [setSheetSnapPoint]
  );

  const handleSendMessage = useCallback(
    async (text: string) => {
      let tid = threadId;
      if (!tid && effectiveGameId) {
        tid = await createThread(effectiveGameId);
        setThreadId(tid);
      }
      if (tid) {
        sendMessage(text, tid, effectiveGameId ?? undefined);
        if (activeTab !== "chat") {
          setActiveTab("chat");
        }
        sheetRef.current?.snapToIndex(isChatMode ? 1 : 2);
      }
    },
    [threadId, effectiveGameId, createThread, sendMessage, activeTab, setActiveTab, isChatMode]
  );

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

  const renderTabBar = useCallback(
    () => (
      <View style={styles.tabHeader}>
        {tabs.map((tab) => {
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
    ),
    [tabs, activeTab, selectedEntityId, setActiveTab]
  );

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props}>
        <View style={styles.footerContainer}>
          <Composer onSend={handleSendMessage} isSubmitting={isSending} />
          {renderTabBar()}
        </View>
      </BottomSheetFooter>
    ),
    [handleSendMessage, isSending, renderTabBar]
  );

  const renderToolContent = useCallback(() => {
    switch (activeTab) {
      case "gallery":
        return (
          <AssetGalleryPanel
            onTemplatePress={(templateId) => {
              console.log("Template pressed:", templateId);
            }}
          />
        );
      case "assets":
        return <AssetsPanel />;
      case "properties":
        return <PropertiesPanel />;
      case "layers":
        return <LayersPanel />;
      case "debug":
        return <DebugPanel />;
      default:
        return null;
    }
  }, [activeTab]);

  if (mode === "playtest") {
    return null;
  }

  // ========== CHAT MODE ==========
  if (isChatMode) {
    return (
      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={chatSnapPoints}
        onChange={handleSheetChange}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        enablePanDownToClose={false}
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

  // ========== TOOL MODE ==========
  return (
    <BottomSheet
      ref={sheetRef}
      index={sheetSnapPoint}
      snapPoints={toolSnapPoints}
      onChange={handleSheetChange}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      enablePanDownToClose={false}
      enableDynamicSizing={false}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <BottomSheetView>
        <Composer onSend={handleSendMessage} isSubmitting={isSending} />
        {renderTabBar()}
      </BottomSheetView>

      <BottomSheetScrollView contentContainerStyle={styles.toolContentContainer}>
        {renderToolContent()}
      </BottomSheetScrollView>
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
    borderTopWidth: 1,
    borderTopColor: "#374151",
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
  toolContentContainer: {
    flexGrow: 1,
  },
});
