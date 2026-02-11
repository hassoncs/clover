import { useCallback, useEffect, useState } from "react";
import { useEditor } from "./EditorProvider";
import { useEditorChat } from "@/components/create-game/useEditorChat";
import { useThreads } from "@/components/create-game/useThreads";

export function useEditorChatSession() {
  const { gameId } = useEditor();

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
  } = useEditorChat(threadId, effectiveGameId);

  const handleSendMessage = useCallback(
    async (text: string) => {
      let tid = threadId;
      if (!tid && effectiveGameId) {
        tid = await createThread(effectiveGameId);
        setThreadId(tid);
      }
      if (tid) {
        sendMessage(text, tid, effectiveGameId ?? undefined);
      }
    },
    [threadId, effectiveGameId, createThread, sendMessage]
  );

  return {
    messages,
    handleSendMessage,
    isRunning,
    isSending,
    submitAnswer,
    submitUserAnswer,
    pendingQuestions,
  };
}
