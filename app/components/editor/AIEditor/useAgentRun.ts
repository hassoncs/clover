import { useState, useEffect, useCallback, useRef } from 'react';
import { trpcReact } from '@/lib/trpc/react';
import { env } from '@/lib/config/env';
import { supabase } from '@/lib/supabase/client';
import type { AgentRun, AgentTier, AgentStep, AgentEventType, AgentEventPayload, ClarificationQuestion, UserQuestion } from '@slopcade/shared';

export interface ClientAgentEvent {
  seq: number;
  eventType: AgentEventType;
  payload: AgentEventPayload;
  timestamp: number;
  id?: string;
}

export interface UseAgentRunResult {
  run: AgentRun | null;
  steps: AgentStep[];
  events: ClientAgentEvent[];
  questions: ClarificationQuestion[];
  pendingQuestions: {
    batchId: string;
    questions: UserQuestion[];
    stage: string;
    stepIndex: number;
  } | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  
  gateValues: Record<string, string>;
  satisfiedFields: string[];
  unsatisfiedFields: string[];
  
  createRun: (params: { gameId: string; tier: AgentTier; planningDocJson?: string }) => Promise<string>;
  startRun: (runId: string) => Promise<void>;
  pauseRun: (runId: string) => Promise<void>;
  resumeRun: (runId: string) => Promise<void>;
  cancelRun: (runId: string) => Promise<void>;
  updatePlanningDoc: (runId: string, planningDocJson: string) => Promise<void>;
  submitAnswer: (questionId: string, answer: string) => Promise<void>;
  submitUserAnswer: (batchId: string, answers: string[][]) => Promise<void>;
}

export function useAgentRun(runId?: string): UseAgentRunResult {
  const [run, setRun] = useState<AgentRun | null>(null);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [events, setEvents] = useState<ClientAgentEvent[]>([]);
  const [questions, setQuestions] = useState<ClarificationQuestion[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState<{
    batchId: string;
    questions: UserQuestion[];
    stage: string;
    stepIndex: number;
  } | null>(null);
  const [gateValues, setGateValues] = useState<Record<string, string>>({});
  const [satisfiedFields, setSatisfiedFields] = useState<string[]>([]);
  const [unsatisfiedFields, setUnsatisfiedFields] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSeqRef = useRef<number>(0);

  const utils = trpcReact.useUtils();

  const createRunMutation = trpcReact.agentRuns.createRun.useMutation();
  const startRunMutation = trpcReact.agentRuns.startRun.useMutation();
  const updatePlanningDocMutation = trpcReact.agentRuns.updatePlanningDoc.useMutation();
  const submitAnswerMutation = trpcReact.agentRuns.submitAnswer.useMutation();
  const submitUserAnswerMutation = trpcReact.agentRuns.submitUserAnswer.useMutation();

  const { data: initialData, isLoading: isInitialLoading, error: initialError } = trpcReact.agentRuns.getRun.useQuery(
    { runId: runId! },
    { 
      enabled: !!runId,
      refetchOnWindowFocus: false 
    }
  );

  useEffect(() => {
    if (initialData) {
      setRun(initialData.run);
      setSteps(initialData.steps);
    }
  }, [initialData]);

  useEffect(() => {
    if (initialError) {
      setError(initialError.message);
    }
  }, [initialError]);

  useEffect(() => {
    if (!runId) {
      setIsConnected(false);
      return;
    }

    const connect = async () => {
      let token: string | null = null;
      if (supabase) {
        try {
          const { data } = await supabase.auth.getSession();
          token = data.session?.access_token ?? null;
        } catch { }
      }
      if (!token && __DEV__) token = 'dev-token';
      if (!token) {
        setError('Authentication required');
        return;
      }

      const apiUrl = env.apiUrl;
      const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
      const wsHost = apiUrl.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}://${wsHost}/ws/agent-run/${runId}?lastSeq=${lastSeqRef.current}&token=${encodeURIComponent(token)}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'snapshot') {
             if (data.run) {
                setRun(prev => prev ? { ...prev, status: data.run.status, currentStepIndex: data.run.currentStepIndex } : null);
             }
          } else if (data.type === 'event') {
            const newEvent = data as ClientAgentEvent;
            lastSeqRef.current = Math.max(lastSeqRef.current, newEvent.seq);
            setEvents(prev => {
              if (prev.some(e => e.seq === newEvent.seq)) return prev;
              return [...prev, newEvent].sort((a, b) => a.seq - b.seq);
            });
            
            if (newEvent.eventType === 'run_completed') {
                setRun(prev => prev ? { ...prev, status: 'succeeded' } : null);
            } else if (newEvent.eventType === 'run_failed') {
                setRun(prev => prev ? { ...prev, status: 'failed' } : null);
            } else if (newEvent.eventType === 'step_started') {
                setRun(prev => prev ? { ...prev, status: 'running', currentStepIndex: (newEvent.payload as any).stepIndex } : null);
            }
          } else if (data.type === 'error') {
            setError(data.message);
          }
        } catch (err) {
          console.error('[useAgentRun] Failed to parse WS message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        
        if (run?.status === 'running' || run?.status === 'queued' || run?.status === 'planning') {
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [runId, run?.status]);

  const shouldPoll = !!runId && !isConnected && (run?.status === 'running' || run?.status === 'queued');
  
  const { data: pollData } = trpcReact.agentRuns.pollRunStatus.useQuery(
    { runId: runId!, lastSeq: lastSeqRef.current },
    {
      enabled: shouldPoll,
      refetchInterval: 2000,
    }
  );

  useEffect(() => {
    if (pollData) {
        setRun(prev => prev ? { ...prev, status: pollData.status, currentStepIndex: pollData.currentStepIndex } : null);
        if (pollData.events && pollData.events.length > 0) {
            setEvents(prev => {
                const newEvents = pollData.events.filter(e => !prev.some(p => p.seq === e.seq));
                return [...prev, ...newEvents].sort((a, b) => a.seq - b.seq) as ClientAgentEvent[];
            });
            lastSeqRef.current = Math.max(lastSeqRef.current, ...pollData.events.map(e => e.seq));
        }
    }
  }, [pollData]);

  // Process events to build questions list and gate state
  useEffect(() => {
    const processedQuestions = new Map<string, ClarificationQuestion>();
    let currentGateValues: Record<string, string> = {};
    let currentSatisfied: string[] = [];
    let currentUnsatisfied: string[] = [];
    let currentPendingQuestions: {
      batchId: string;
      questions: UserQuestion[];
      stage: string;
      stepIndex: number;
    } | null = null;
    
    // Process in chronological order
    const sortedEvents = [...events].sort((a, b) => a.seq - b.seq);
    
    for (const event of sortedEvents) {
      if (event.eventType === 'clarification_requested') {
        const payload = event.payload as Extract<AgentEventPayload, { type: 'clarification_requested' }>;
        processedQuestions.set(payload.questionId, {
          questionId: payload.questionId,
          question: payload.question,
          stage: payload.stage,
          stepIndex: payload.stepIndex,
          context: payload.context,
        });
      } else if (event.eventType === 'clarification_answered') {
        const payload = event.payload as Extract<AgentEventPayload, { type: 'clarification_answered' }>;
        const existing = processedQuestions.get(payload.questionId);
        if (existing) {
          processedQuestions.set(payload.questionId, {
            ...existing,
            answer: payload.answer,
          });
        }
      } else if (event.eventType === 'user_question') {
        const payload = event.payload as Extract<AgentEventPayload, { type: 'user_question' }>;
        currentPendingQuestions = {
          batchId: payload.batchId,
          questions: payload.questions,
          stage: payload.stage,
          stepIndex: payload.stepIndex,
        };
      } else if (event.eventType === 'user_answer') {
        currentPendingQuestions = null;
      } else if (event.eventType === 'gate_values_updated') {
        const payload = event.payload as Extract<AgentEventPayload, { type: 'gate_values_updated' }>;
        currentGateValues = payload.gateValues;
        currentSatisfied = payload.satisfiedFields;
        currentUnsatisfied = payload.unsatisfiedFields;
      } else if (event.eventType === 'planning_complete') {
        const payload = event.payload as Extract<AgentEventPayload, { type: 'planning_complete' }>;
        currentGateValues = payload.finalGateValues;
        // All fields are satisfied when planning is complete
        currentSatisfied = Object.keys(payload.finalGateValues);
        currentUnsatisfied = [];
      }
    }
    
    setQuestions(Array.from(processedQuestions.values()));
    setPendingQuestions(currentPendingQuestions);
    setGateValues(currentGateValues);
    setSatisfiedFields(currentSatisfied);
    setUnsatisfiedFields(currentUnsatisfied);
  }, [events]);

  const createRun = useCallback(async (params: { gameId: string; tier: AgentTier; planningDocJson?: string }) => {
    const result = await createRunMutation.mutateAsync({
        gameId: params.gameId,
        tier: params.tier,
        source: 'scratch',
    });
    
    if (params.planningDocJson) {
        await updatePlanningDocMutation.mutateAsync({
            runId: result.runId,
            planningDocJson: params.planningDocJson
        });
    }
    
    return result.runId;
  }, [createRunMutation, updatePlanningDocMutation]);

  const startRun = useCallback(async (id: string) => {
    await startRunMutation.mutateAsync({ runId: id });
  }, [startRunMutation]);

  const sendControlCommand = useCallback((type: 'pause' | 'resume' | 'cancel', runId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    const commandId = Math.random().toString(36).substring(7);
    wsRef.current.send(JSON.stringify({
      type,
      commandId
    }));
  }, []);

  const pauseRun = useCallback(async (id: string) => {
    sendControlCommand('pause', id);
  }, [sendControlCommand]);

  const resumeRun = useCallback(async (id: string) => {
    sendControlCommand('resume', id);
  }, [sendControlCommand]);

  const cancelRun = useCallback(async (id: string) => {
    sendControlCommand('cancel', id);
  }, [sendControlCommand]);

  const updatePlanningDoc = useCallback(async (id: string, docJson: string) => {
    await updatePlanningDocMutation.mutateAsync({ 
        runId: id, 
        planningDocJson: docJson 
    });
  }, [updatePlanningDocMutation]);

  const submitAnswer = useCallback(async (questionId: string, answer: string) => {
    if (!runId) return;
    await submitAnswerMutation.mutateAsync({
      runId,
      questionId,
      answer
    });
  }, [runId, submitAnswerMutation]);

  const submitUserAnswer = useCallback(async (batchId: string, answers: string[][]) => {
    if (!runId) return;
    await submitUserAnswerMutation.mutateAsync({
      runId,
      batchId,
      answers,
    });
  }, [runId, submitUserAnswerMutation]);

  return {
    run,
    steps,
    events,
    questions,
    pendingQuestions,
    gateValues,
    satisfiedFields,
    unsatisfiedFields,
    isConnected,
    isLoading: isInitialLoading,
    error,
    createRun,
    startRun,
    pauseRun,
    resumeRun,
    cancelRun,
    updatePlanningDoc,
    submitAnswer,
    submitUserAnswer
  };
}
