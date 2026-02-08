import { useCallback, useEffect, useRef } from 'react';
import { atom, useAtom } from 'jotai';
import { useAgentRun } from '@/components/editor/AIEditor/useAgentRun';
import { useAgentNotifications } from '@/lib/notifications';
import type { AgentEventPayload } from '@slopcade/shared';
import { ChatMessage } from './types';

type PayloadOf<T extends AgentEventPayload['type']> = Extract<AgentEventPayload, { type: T }>;

const runIdAtom = atom<string | undefined>(undefined);
const messagesAtom = atom<ChatMessage[]>([]);
const processedSeqsAtom = atom(new Set<number>());

export function useCreateGameChat() {
  const [runId, setRunId] = useAtom(runIdAtom);
  const [messages, setMessages] = useAtom(messagesAtom);
  const [processedSeqs] = useAtom(processedSeqsAtom);
  const processedEventSeqs = useRef(processedSeqs);
  
  const { 
    run, 
    events, 
    isConnected, 
    error, 
    createRun, 
    startRun,
    cancelRun,
    pendingQuestions,
    questions,
    submitAnswer,
    submitUserAnswer
  } = useAgentRun(runId);

  useAgentNotifications(events);

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      type: 'text',
      text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const newRunId = await createRun({ 
        gameId: crypto.randomUUID(), 
        tier: 'standard', 
        planningDocJson: JSON.stringify({ content: text }) 
      });
      setRunId(newRunId);
      await startRun(newRunId);
    } catch (e) {
      console.error('Failed to start run:', e);
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'system',
        type: 'error',
        text: 'Failed to start game creation. Please try again.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  }, [createRun, startRun, setMessages, setRunId]);

  useEffect(() => {
    if (!events.length) return;

    setMessages(prevMessages => {
      const nextMessages = [...prevMessages];
      const processed = processedEventSeqs.current;
      let hasChanges = false;

      const sortedEvents = [...events].sort((a, b) => a.seq - b.seq);

      for (const event of sortedEvents) {
        if (processed.has(event.seq)) continue;
        processed.add(event.seq);
        hasChanges = true;

        const timestamp = event.timestamp;
        const id = event.id || `evt-${event.seq}`;

        switch (event.eventType) {
          case 'step_started': {
            const p = event.payload as PayloadOf<'step_started'>;
            nextMessages.push({
              id,
              role: 'system',
              type: 'status',
              text: `Starting ${p.stage} phase...`,
              timestamp,
            });
            break;
          }
          case 'step_completed': {
            const p = event.payload as PayloadOf<'step_completed'>;
            nextMessages.push({
              id,
              role: 'system',
              type: 'status',
              text: `Completed step ${p.stepIndex}`,
              timestamp,
            });
            break;
          }
          case 'gate_values_updated': {
            const p = event.payload as PayloadOf<'gate_values_updated'>;
            const satisfied = p.satisfiedFields.length;
            if (satisfied > 0) {
              nextMessages.push({
                id,
                role: 'system',
                type: 'status',
                text: `${satisfied} requirements met`,
                timestamp,
              });
            }
            break;
          }
          case 'planning_complete':
            nextMessages.push({
              id,
              role: 'agent',
              type: 'text',
              text: "Planning complete! I have a solid plan for your game.",
              timestamp,
            });
            break;
          case 'user_question': {
            const p = event.payload as PayloadOf<'user_question'>;
            nextMessages.push({
              id,
              role: 'agent',
              type: 'user_question',
              text: p.questions[0]?.header ?? "I have some questions...",
              timestamp,
              payload: p,
              pending: true,
            });
            break;
          }
          case 'clarification_requested': {
            const p = event.payload as PayloadOf<'clarification_requested'>;
            nextMessages.push({
              id,
              role: 'agent',
              type: 'clarification',
              text: p.question,
              timestamp,
              payload: p,
              pending: true,
            });
            break;
          }
          case 'clarification_answered': {
            const p = event.payload as PayloadOf<'clarification_answered'>;
            const qIndex = nextMessages.findIndex(m => {
              if (m.type !== 'clarification') return false;
              const mp = m.payload as PayloadOf<'clarification_requested'> | undefined;
              return mp?.questionId === p.questionId;
            });
            if (qIndex !== -1) {
              nextMessages[qIndex] = { ...nextMessages[qIndex], pending: false };
            }
            nextMessages.push({
              id: `ans-${event.seq}`,
              role: 'user',
              type: 'text',
              text: p.answer,
              timestamp,
            });
            break;
          }
          case 'user_answer': {
            const p = event.payload as PayloadOf<'user_answer'>;
            const uqIndex = nextMessages.findIndex(m => {
              if (m.type !== 'user_question') return false;
              const mp = m.payload as PayloadOf<'user_question'> | undefined;
              return mp?.batchId === p.batchId;
            });
            if (uqIndex !== -1) {
              nextMessages[uqIndex] = { ...nextMessages[uqIndex], pending: false };
            }
            break;
          }
          case 'run_completed':
            nextMessages.push({
              id,
              role: 'system',
              type: 'completion',
              text: "Your game is ready!",
              timestamp,
            });
            break;
          case 'run_failed': {
            const p = event.payload as PayloadOf<'run_failed'>;
            nextMessages.push({
              id,
              role: 'system',
              type: 'error',
              text: p.errorMessage || "Run failed",
              timestamp,
            });
            break;
          }
          case 'run_canceled':
            nextMessages.push({
              id,
              role: 'system',
              type: 'status',
              text: "Run was canceled.",
              timestamp,
            });
            break;
          case 'error': {
            const p = event.payload as PayloadOf<'error'>;
            nextMessages.push({
              id,
              role: 'system',
              type: 'error',
              text: p.errorMessage || "An error occurred",
              timestamp,
            });
            break;
          }
          case 'asset_preview': {
            const p = event.payload as PayloadOf<'asset_preview'>;
            nextMessages.push({
              id,
              role: 'agent',
              type: 'asset_preview',
              text: p.assetId,
              timestamp,
              payload: p,
            });
            break;
          }
        }
      }
      
      return hasChanges ? nextMessages : prevMessages;
    });
  }, [events, setMessages]);

  const cancelBuild = useCallback(async () => {
    if (!runId) return;

    const status = run?.status;
    if (status === 'succeeded' || status === 'failed' || status === 'canceled') {
      return;
    }

    try {
      await cancelRun(runId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('WebSocket not connected')) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'system',
          type: 'status',
          text: 'Connection lost. The run may still be processing on the server.',
          timestamp: Date.now(),
        }]);
      } else {
        console.error('Failed to cancel run:', e);
      }
    }
  }, [runId, run?.status, cancelRun, setMessages]);

  const resetSession = useCallback(() => {
    setRunId(undefined);
    setMessages([]);
    processedEventSeqs.current = new Set<number>();
  }, [setRunId, setMessages]);

  return {
    messages,
    isRunning: run?.status === 'running' || run?.status === 'planning' || run?.status === 'queued',
    isConnected,
    error,
    sendMessage,
    cancelBuild,
    resetSession,
    pendingQuestions,
    questions,
    submitAnswer,
    submitUserAnswer,
    run
  };
}
