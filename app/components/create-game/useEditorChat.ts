import { useCallback, useEffect, useState } from 'react';
import { trpcReact as trpc } from '@/lib/trpc/react';
import { ChatMessage } from './types';

// Helper to convert new message format to UI ChatMessage
function convertToChatMessage(msg: any): ChatMessage | null {
  // Map roles
  let role: ChatMessage['role'] = 'system';
  if (msg.role === 'user') role = 'user';
  if (msg.role === 'assistant') role = 'agent';
  
  // Map types
  let type: ChatMessage['type'] = 'text';
  if (msg.role === 'system') type = 'status';
  if (msg.error) type = 'error';
  
  // Handle specific component types if present
  if (msg.componentName === 'UserQuestion') type = 'user_question';
  if (msg.componentName === 'Clarification') type = 'clarification';
  if (msg.componentName === 'AssetPreview') type = 'asset_preview';

  // Parse content if it's a string (it should be JSON object based on API, but let's be safe)
  let text = '';
  if (typeof msg.content === 'string') {
    text = msg.content;
  } else if (msg.content && typeof msg.content === 'object') {
    text = msg.content.text || JSON.stringify(msg.content);
  }

  return {
    id: msg.id,
    role,
    type,
    text,
    timestamp: msg.createdAt,
    payload: msg.componentProps || msg.content,
    toolCallId: msg.toolCallId,
  };
}

export function useEditorChat(threadId: string | null, gameId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [pendingInput, setPendingInput] = useState<any>(null);
  
  // Poll thread status
  const threadQuery = trpc.chatThreads.getThread.useQuery(
    { threadId: threadId! },
    { 
      enabled: !!threadId,
      refetchInterval: 1000,
    }
  );

  // Poll messages
  const messagesQuery = trpc.chatThreads.getMessages.useQuery(
    { threadId: threadId!, limit: 100 },
    { 
      enabled: !!threadId,
      refetchInterval: 1000,
    }
  );

  const documentQuery = trpc.chatThreads.readWorkspaceFile.useQuery(
    { gameId: gameId!, filename: 'document.md' },
    { 
      enabled: !!gameId,
      refetchInterval: 3000,
    }
  );

  const sendMessageMutation = trpc.chatThreads.sendMessage.useMutation();
  const submitToolAnswerMutation = trpc.chatThreads.submitToolAnswer.useMutation();
  
  const balanceQuery = trpc.economy.getBalance.useQuery(undefined, {
    refetchInterval: 5000,
  });

  // Process messages
  useEffect(() => {
    if (messagesQuery.data?.messages) {
      const newMessages = messagesQuery.data.messages
        .map(convertToChatMessage)
        .filter((m): m is ChatMessage => m !== null);
      
      // If we have a pending input from mutation, append it as a pending message
      if (pendingInput) {
        const pendingMsg: ChatMessage = {
          id: 'pending-input-' + Date.now(),
          role: 'agent',
          type: pendingInput.type === 'user_question' ? 'user_question' : 'clarification',
          text: pendingInput.question || 'Please answer this question',
          timestamp: Date.now(),
          payload: pendingInput,
          pending: true,
          toolCallId: pendingInput.toolCallId,
        };
        
        newMessages.push(pendingMsg);
      }

      setMessages(newMessages);
    }
  }, [messagesQuery.data, pendingInput]);

  // Handle thread status for isSending
  useEffect(() => {
    if (threadQuery.data) {
      const stage = threadQuery.data.generationStage;
      // If generating, we are sending/processing
      if (stage === 'generating') {
        setIsSending(true);
      } else if (stage === 'waiting_for_input') {
        setIsSending(false);
      } else {
        setIsSending(false);
      }
    }
  }, [threadQuery.data]);

  const sendMessage = useCallback(async (text: string, overrideThreadId?: string, overrideGameId?: string) => {
    const targetThreadId = overrideThreadId ?? threadId;
    const targetGameId = overrideGameId ?? gameId;

    if (!targetGameId) return;

    if (balanceQuery.data?.balanceMicros === 0) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'system',
        type: 'error',
        text: 'Insufficient balance. Please add Sparks to continue.',
        timestamp: Date.now(),
      }]);
      return;
    }

    setIsSending(true);
    // Optimistic update
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      type: 'text',
      text,
      timestamp: Date.now(),
    }]);

    try {
      const result = await sendMessageMutation.mutateAsync({
        threadId: targetThreadId ?? undefined,
        gameId: targetGameId,
        text,
      });

      if (result.pendingAskUser) {
        setPendingInput(result.pendingAskUser);
      } else {
        setPendingInput(null);
      }
      
      // Force refetch
      messagesQuery.refetch();
      threadQuery.refetch();
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorText = error instanceof Error ? error.message : 'Failed to send message.';
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'system',
        type: 'error',
        text: errorText,
        timestamp: Date.now(),
      }]);
      setIsSending(false);
    }
  }, [threadId, gameId, sendMessageMutation, messagesQuery, threadQuery, balanceQuery.data]);

  const submitAnswer = useCallback(async (questionId: string, answer: string) => {
    if (!threadId) return;

    try {
      const result = await submitToolAnswerMutation.mutateAsync({
        threadId,
        toolCallId: questionId,
        answer,
      });
      
      if (result.pendingAskUser) {
        setPendingInput(result.pendingAskUser);
      } else {
        setPendingInput(null);
      }
      
      messagesQuery.refetch();
      threadQuery.refetch();
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  }, [threadId, submitToolAnswerMutation, messagesQuery, threadQuery]);

  const submitUserAnswer = useCallback(async (batchId: string, answers: string[][]) => {
    if (!threadId) return;

    try {
      const result = await submitToolAnswerMutation.mutateAsync({
        threadId,
        toolCallId: batchId,
        answer: JSON.stringify(answers),
      });
      
      if (result.pendingAskUser) {
        setPendingInput(result.pendingAskUser);
      } else {
        setPendingInput(null);
      }

      messagesQuery.refetch();
      threadQuery.refetch();
    } catch (error) {
      console.error('Failed to submit user answer:', error);
    }
  }, [threadId, submitToolAnswerMutation, messagesQuery, threadQuery]);

  const cancelBuild = useCallback(async () => {
    setIsSending(false);
  }, []);

  const resetSession = useCallback(() => {
    setMessages([]);
    setPendingInput(null);
  }, []);

  // Derived state for UI
  const pendingQuestions = pendingInput?.type === 'user_question' ? pendingInput : null;
  
  const questions = pendingInput?.type === 'clarification' ? [{
    questionId: pendingInput.toolCallId,
    question: pendingInput.question,
    stage: 'clarification',
    stepIndex: 0,
    context: pendingInput.context,
  }] : [];

  return {
    messages,
    sendMessage,
    cancelBuild,
    resetSession,
    submitAnswer,
    submitUserAnswer,
    run: threadQuery.data?.generationStage === 'generating' ? { status: 'running', gameId } : null,
    isRunning: threadQuery.data?.generationStage === 'generating',
    isSending,
    documentContent: documentQuery.data?.content ?? null,
    pendingQuestions,
    questions,
    isConnected: true,
    error: null,
  };
}
