import { useCallback, useEffect, useState } from "react";
import { useEditor, type EditorTab } from "./EditorProvider";
import { EditorToolbar } from "./EditorToolbar";
import { ChatSheet } from "./ChatSheet";
import { ToolSheet } from "./ToolSheet";
import { useCreateGameChat } from "@/components/create-game/useCreateGameChat";
import { useThreads } from "@/components/create-game/useThreads";

export function BottomSheetHost() {
  const { mode, gameId } = useEditor();

  const effectiveGameId = gameId !== "preview" ? gameId : null;
  const { threads, createThread, initForGame } = useThreads();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeToolTab, setActiveToolTab] = useState<EditorTab | null>(null);

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

  const handleSendMessage = useCallback(
    async (text: string) => {
      let tid = threadId;
      if (!tid && effectiveGameId) {
        tid = await createThread(effectiveGameId);
        setThreadId(tid);
      }
      if (tid) {
        sendMessage(text, tid, effectiveGameId ?? undefined);
        setActiveToolTab(null);
        setChatOpen(true);
      }
    },
    [threadId, effectiveGameId, createThread, sendMessage]
  );

  const handleTabPress = useCallback(
    (tabId: EditorTab) => {
      setChatOpen(false);
      setActiveToolTab(tabId);
    },
    []
  );

  const handleDismissChat = useCallback(() => {
    setChatOpen(false);
  }, []);

  const handleDismissTool = useCallback(() => {
    setActiveToolTab(null);
  }, []);

  if (mode === "playtest") {
    return null;
  }

  return (
    <>
      <EditorToolbar
        onSendMessage={handleSendMessage}
        onTabPress={handleTabPress}
        isSending={isSending}
      />
      <ChatSheet
        visible={chatOpen}
        onDismiss={handleDismissChat}
        messages={messages}
        onSendMessage={handleSendMessage}
        isSending={isSending}
        isRunning={isRunning}
        submitAnswer={submitAnswer}
        submitUserAnswer={submitUserAnswer}
        pendingQuestions={pendingQuestions}
      />
      <ToolSheet
        activeTab={activeToolTab}
        onDismiss={handleDismissTool}
      />
    </>
  );
}
