import { useCallback, useEffect, useState } from 'react';
import { trpcReact as trpc } from '@/lib/trpc/react';
import type { ChatEventPayload } from '@slopcade/shared';
import { ChatMessage } from './types';

function chatEventToMessage(event: { id: string; eventType: string; payload: ChatEventPayload; createdAt: number }): ChatMessage | null {
  const p = event.payload as any;
  switch (event.eventType) {
    case 'user_message':
      if (p.type === 'user_message') {
        return { id: event.id, role: 'user', type: 'text', text: p.text, timestamp: event.createdAt };
      }
      return null;
    case 'assistant_message':
      if (p.type === 'assistant_message') {
        return { id: event.id, role: 'agent', type: 'text', text: p.text, timestamp: event.createdAt };
      }
      return null;
    case 'system':
      if (p.type === 'system') {
        return { id: event.id, role: 'system', type: 'status', text: p.text, timestamp: event.createdAt };
      }
      return null;
    case 'file_updated':
      if (p.type === 'file_updated') {
        return { id: event.id, role: 'system', type: 'status', text: `Updated ${p.filename}`, timestamp: event.createdAt };
      }
      return null;
    case 'user_question':
      if (p.type === 'user_question') {
        return {
          id: event.id,
          role: 'agent',
          type: 'user_question',
          text: p.questions[0]?.header ?? "I have some questions...",
          timestamp: event.createdAt,
          payload: p,
          pending: true,
        };
      }
      return null;
    case 'clarification_requested':
      if (p.type === 'clarification_requested') {
        return {
          id: event.id,
          role: 'agent',
          type: 'clarification',
          text: p.question,
          timestamp: event.createdAt,
          payload: p,
          pending: true,
        };
      }
      return null;
    case 'clarification_answered':
      if (p.type === 'clarification_answered') {
        return {
          id: event.id,
          role: 'user',
          type: 'text',
          text: p.answer,
          timestamp: event.createdAt,
        };
      }
      return null;
    case 'run_completed':
      return {
        id: event.id,
        role: 'system',
        type: 'completion',
        text: "Your game is ready!",
        timestamp: event.createdAt,
      };
    case 'run_failed':
      return {
        id: event.id,
        role: 'system',
        type: 'error',
        text: "Run failed",
        timestamp: event.createdAt,
      };
    case 'error':
       if (p.type === 'error') {
        return {
            id: event.id,
            role: 'system',
            type: 'error',
            text: p.errorMessage || "An error occurred",
            timestamp: event.createdAt,
        };
       }
       return null;
    default:
      return null;
  }
}

export function useCreateGameChat(threadId: string | null, gameId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  const eventsQuery = trpc.chatThreads.getEvents.useQuery(
    { threadId: threadId! },
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

  const appendUserMessageMutation = trpc.chatThreads.appendUserMessage.useMutation();
  const createRunMutation = trpc.agentRuns.createRun.useMutation();
  const startRunMutation = trpc.agentRuns.startRun.useMutation();
  const submitAnswerMutation = trpc.agentRuns.submitAnswer.useMutation();
  const submitUserAnswerMutation = trpc.agentRuns.submitUserAnswer.useMutation();
  const cancelRunMutation = trpc.agentRuns.cancelRun.useMutation();

  useEffect(() => {
    if (eventsQuery.data?.events) {
      const newMessages: ChatMessage[] = [];
      const sortedEvents = [...eventsQuery.data.events].sort((a, b) => a.seq - b.seq);
      
      for (const event of sortedEvents) {
        const msg = chatEventToMessage(event);
        if (msg) {
          if ((event.eventType as string) === 'clarification_answered') {
             const p = event.payload as any;
             const qIndex = newMessages.findIndex(m => {
                if (m.type !== 'clarification') return false;
                const mp = m.payload as any;
                return mp?.questionId === p.questionId;
             });
             if (qIndex !== -1) {
                newMessages[qIndex] = { ...newMessages[qIndex], pending: false };
             }
          }
           if ((event.eventType as string) === 'user_answer') {
             const p = event.payload as any;
             const uqIndex = newMessages.findIndex(m => {
                if (m.type !== 'user_question') return false;
                const mp = m.payload as any;
                return mp?.batchId === p.batchId;
             });
             if (uqIndex !== -1) {
                newMessages[uqIndex] = { ...newMessages[uqIndex], pending: false };
             }
          }

          newMessages.push(msg);
        }
      }
      setMessages(newMessages);

      if (runId) {
        const hasResponseForRun = sortedEvents.some(e => {
          const p = e.payload as any;
          const type = e.eventType as string;
          
          if (type === 'assistant_message' && p?.runId === runId) return true;
          if (type === 'run_completed' && p?.runId === runId) return true;
          if (type === 'run_failed' && p?.runId === runId) return true;
          return false;
        });

        if (hasResponseForRun) {
          setRunId(null);
        }
      }
    }
  }, [eventsQuery.data, runId]);

  const sendMessage = useCallback(async (text: string, overrideThreadId?: string, overrideGameId?: string) => {
    const targetThreadId = overrideThreadId ?? threadId;
    const targetGameId = overrideGameId ?? gameId;

    if (!targetThreadId || !targetGameId) return;

    setIsSending(true);
    const tempId = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id: tempId,
      role: 'user',
      type: 'text',
      text,
      timestamp: Date.now(),
    }]);

    try {
      await appendUserMessageMutation.mutateAsync({ threadId: targetThreadId, text });
      
      const runResult = await createRunMutation.mutateAsync({ 
        gameId: targetGameId, 
        threadId: targetThreadId, 
        tier: 'standard',
        source: 'scratch'
      });
      
      setRunId(runResult.runId);
      await startRunMutation.mutateAsync({ runId: runResult.runId });
      
      eventsQuery.refetch();
    } catch (e) {
      console.error('Failed to send message:', e);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'system',
        type: 'error',
        text: 'Failed to send message. Please try again.',
        timestamp: Date.now(),
      }]);
    } finally {
      setIsSending(false);
    }
  }, [threadId, gameId, appendUserMessageMutation, createRunMutation, startRunMutation, eventsQuery]);

  const submitAnswer = useCallback(async (questionId: string, answer: string) => {
    if (!runId) return;
    await submitAnswerMutation.mutateAsync({ runId, questionId, answer });
  }, [runId, submitAnswerMutation]);

  const submitUserAnswer = useCallback(async (batchId: string, answers: string[][]) => {
    if (runId) {
        await submitUserAnswerMutation.mutateAsync({ runId, batchId, answers });
    }
  }, [runId, submitUserAnswerMutation]);

  const cancelBuild = useCallback(async () => {
    if (runId) {
      await cancelRunMutation.mutateAsync({ runId });
    }
  }, [runId, cancelRunMutation]);

  const resetSession = useCallback(() => {
    setMessages([]);
    setRunId(null);
  }, []);

  const pendingQuestions = messages.find(m => m.pending && m.type === 'user_question')?.payload as any;
  const questions = messages.filter(m => m.pending && m.type === 'clarification').map(m => ({
    questionId: (m.payload as any).questionId,
    question: m.text,
    stage: (m.payload as any).stage,
    stepIndex: (m.payload as any).stepIndex,
    context: (m.payload as any).context,
  }));

  return {
    messages,
    sendMessage,
    cancelBuild,
    resetSession,
    submitAnswer,
    submitUserAnswer,
    run: runId ? { status: 'running', gameId } : null,
    isRunning: !!runId,
    isSending,
    documentContent: documentQuery.data?.content ?? null,
    pendingQuestions,
    questions,
    isConnected: true,
    error: null,
  };
}
