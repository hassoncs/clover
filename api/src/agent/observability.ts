export interface AgentLogEvent {
  event: string;
  runId: string;
  userId?: string;
  tier?: string;
  stepIndex?: number;
  stage?: string;
  costMicros?: number;
  durationMs?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export function logAgentEvent(event: AgentLogEvent): void {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    ...event,
  }));
}
