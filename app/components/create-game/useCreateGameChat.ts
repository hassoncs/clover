import { useState, useCallback, useEffect, useRef } from 'react';
import { useAgentRun } from '@/components/editor/AIEditor/useAgentRun';
import { ChatMessage } from './types';

export function useCreateGameChat() {
  const [runId, setRunId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const processedEventSeqs = useRef<Set<number>>(new Set());
  
  const { 
    run, 
    events, 
    isConnected, 
    error, 
    createRun, 
    startRun,
    pendingQuestions,
    questions,
    submitAnswer,
    submitUserAnswer
  } = useAgentRun(runId);

  const sendMessage = useCallback(async (text: string) => {
    // Add user message immediately
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
  }, [createRun, startRun]);

  useEffect(() => {
    if (!events.length) return;

    setMessages(prevMessages => {
      const nextMessages = [...prevMessages];
      const processed = processedEventSeqs.current;
      let hasChanges = false;

      // Sort events by sequence to ensure order
      const sortedEvents = [...events].sort((a, b) => a.seq - b.seq);

      for (const event of sortedEvents) {
        if (processed.has(event.seq)) continue;
        processed.add(event.seq);
        hasChanges = true;

        const timestamp = event.timestamp;
        const id = event.id || `evt-${event.seq}`;

        switch (event.eventType) {
          case 'step_started':
            nextMessages.push({
              id,
              role: 'system',
              type: 'status',
              text: `Starting ${(event.payload as any).stage} phase...`,
              timestamp,
            });
            break;
          case 'step_completed':
             nextMessages.push({
              id,
              role: 'system',
              type: 'status',
              text: `Completed step ${(event.payload as any).stepIndex}`,
              timestamp,
            });
            break;
          case 'gate_values_updated': {
            const gPayload = event.payload as any;
            const satisfied = gPayload.satisfiedFields?.length || 0;
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
            const qPayload = event.payload as any;
            nextMessages.push({
              id,
              role: 'agent',
              type: 'user_question',
              text: qPayload.questions?.[0]?.header || "I have some questions...",
              timestamp,
              payload: qPayload,
              pending: true,
            });
            break;
          }
          case 'clarification_requested': {
            const cPayload = event.payload as any;
            nextMessages.push({
              id,
              role: 'agent',
              type: 'clarification',
              text: cPayload.question,
              timestamp,
              payload: cPayload,
              pending: true,
            });
            break;
          }
          case 'clarification_answered': {
             const answerPayload = event.payload as any;
             const qIndex = nextMessages.findIndex(m => 
               m.type === 'clarification' && (m.payload as any)?.questionId === answerPayload.questionId
             );
             if (qIndex !== -1) {
               nextMessages[qIndex] = { ...nextMessages[qIndex], pending: false };
             }
             
             // Add the user's answer as a message
             nextMessages.push({
               id: `ans-${event.seq}`,
               role: 'user',
               type: 'text',
               text: answerPayload.answer,
               timestamp,
             });
             break;
          }
          case 'user_answer': {
             const uaPayload = event.payload as any;
             const uqIndex = nextMessages.findIndex(m => 
               m.type === 'user_question' && (m.payload as any)?.batchId === uaPayload.batchId
             );
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
          case 'run_failed':
            nextMessages.push({
              id,
              role: 'system',
              type: 'error',
              text: (event.payload as any).errorMessage || "Run failed",
              timestamp,
            });
            break;
          case 'run_canceled':
            nextMessages.push({
              id,
              role: 'system',
              type: 'status',
              text: "Run was canceled.",
              timestamp,
            });
            break;
          case 'error':
             nextMessages.push({
              id,
              role: 'system',
              type: 'error',
              text: (event.payload as any).errorMessage || "An error occurred",
              timestamp,
            });
            break;
        }
      }
      
      return hasChanges ? nextMessages : prevMessages;
    });
  }, [events]);

  return {
    messages,
    isRunning: run?.status === 'running' || run?.status === 'planning' || run?.status === 'queued',
    isConnected,
    error,
    sendMessage,
    pendingQuestions,
    questions,
    submitAnswer,
    submitUserAnswer,
    run
  };
}
