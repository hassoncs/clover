import { useCallback, useState } from "react";
import { useEditor, type EditorTab } from "./EditorProvider";
import { EditorToolbar } from "./EditorToolbar";
import { ChatSheet } from "./ChatSheet";
import { ToolSheet } from "./ToolSheet";
import { useEditorChatSession } from "./useEditorChatSession";

export function BottomSheetHost() {
  const { mode } = useEditor();
  const [chatOpen, setChatOpen] = useState(false);
  const [activeToolTab, setActiveToolTab] = useState<EditorTab | null>(null);

  const {
    messages,
    handleSendMessage: sendMessage,
    isRunning,
    isSending,
    submitAnswer,
    submitUserAnswer,
    pendingQuestions,
  } = useEditorChatSession();

  const handleSendMessage = useCallback(
    async (text: string) => {
      await sendMessage(text);
      setActiveToolTab(null);
      setChatOpen(true);
    },
    [sendMessage]
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
