import { z } from 'zod';

export const ChatEventTypeSchema = z.enum([
  'user_message',
  'assistant_message',
  'tool_call',
  'tool_result',
  'file_updated',
  'system',
  'summary_checkpoint',
  'thread_forked',
]);
export type ChatEventType = z.infer<typeof ChatEventTypeSchema>;

export const UserMessagePayload = z.object({
  version: z.literal(1),
  type: z.literal('user_message'),
  text: z.string(),
});

export const AssistantMessagePayload = z.object({
  version: z.literal(1),
  type: z.literal('assistant_message'),
  text: z.string(),
  model: z.string().optional(),
  runId: z.string().optional(),
});

export const ToolCallPayload = z.object({
  version: z.literal(1),
  type: z.literal('tool_call'),
  name: z.string(),
  args: z.record(z.unknown()),
});

export const ToolResultPayload = z.object({
  version: z.literal(1),
  type: z.literal('tool_result'),
  name: z.string(),
  ok: z.boolean(),
  result: z.unknown(),
});

export const FileUpdatedPayload = z.object({
  version: z.literal(1),
  type: z.literal('file_updated'),
  filename: z.string(),
  key: z.string(),
  bytes: z.number(),
  contentType: z.string().optional(),
});

export const SystemPayload = z.object({
  version: z.literal(1),
  type: z.literal('system'),
  text: z.string(),
  level: z.enum(['info', 'warn', 'error']).optional(),
});

export const SummaryCheckpointPayload = z.object({
  version: z.literal(1),
  type: z.literal('summary_checkpoint'),
  summaryId: z.string(),
  coversThroughSeq: z.number(),
});

export const ThreadForkedPayload = z.object({
  version: z.literal(1),
  type: z.literal('thread_forked'),
  parentThreadId: z.string(),
  parentEventSeq: z.number(),
});

export const ChatEventPayloadSchema = z.discriminatedUnion('type', [
  UserMessagePayload,
  AssistantMessagePayload,
  ToolCallPayload,
  ToolResultPayload,
  FileUpdatedPayload,
  SystemPayload,
  SummaryCheckpointPayload,
  ThreadForkedPayload,
]);
export type ChatEventPayload = z.infer<typeof ChatEventPayloadSchema>;

export type ChatThreadStatus = 'active' | 'archived';

export interface ChatThread {
  id: string;
  userId: string;
  gameId: string;
  title: string | null;
  status: ChatThreadStatus;
  parentThreadId: string | null;
  parentEventSeq: number | null;
  lastEventSeq: number;
  createdAt: number;
  updatedAt: number;
}

export interface ChatEvent {
  id: string;
  threadId: string;
  seq: number;
  eventType: ChatEventType;
  role: string | null;
  payload: ChatEventPayload;
  runId: string | null;
  parentEventId: string | null;
  createdAt: number;
}

export interface ChatSummary {
  id: string;
  threadId: string;
  coversThroughSeq: number;
  summaryText: string;
  tokenCount: number | null;
  createdAt: number;
}
