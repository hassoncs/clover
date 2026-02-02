export type BridgeDirection = 'js->godot' | 'godot->js';
export type BridgeKind = 'event' | 'request' | 'response' | 'progress';
export type BridgeChannel = 'realtime' | 'sync' | 'debug';
export type BridgeTopic = string;
export type Unsubscribe = () => void;

export interface BridgeEnvelopeMeta {
  dir: BridgeDirection;
  platform: 'web' | 'native';
  traceId?: string;
  parentId?: string;
  channel?: BridgeChannel | string;
  priority?: 0 | 1 | 2 | 3;
  dropped?: number;
}

export interface BridgeEnvelopeError {
  code: string;
  message: string;
  data?: unknown;
}

export interface BridgeEnvelopeV1 {
  v: 1;
  kind: BridgeKind;
  id: string;
  topic: BridgeTopic;
  ts: number;
  seq?: number;
  payload?: unknown;
  error?: BridgeEnvelopeError;
  meta?: BridgeEnvelopeMeta;
}

export interface BridgeBatchV1 {
  v: 1;
  kind: 'batch';
  ts: number;
  items: BridgeEnvelopeV1[];
}

export interface EventBridge {
  publish<TPayload>(
    topic: BridgeTopic,
    payload: TPayload,
    opts?: { channel?: BridgeChannel | string; priority?: number }
  ): void;

  request<TReq, TRes>(
    topic: BridgeTopic,
    payload: TReq,
    opts?: { timeoutMs?: number; signal?: AbortSignal }
  ): Promise<TRes>;

  requestWithProgress<TReq, TProgress, TRes>(
    topic: BridgeTopic,
    payload: TReq,
    onProgress: (progress: TProgress) => void,
    opts?: { timeoutMs?: number; signal?: AbortSignal }
  ): Promise<TRes>;

  subscribe<TPayload>(
    topic: BridgeTopic,
    handler: (payload: TPayload, meta: BridgeEnvelopeV1) => void
  ): Unsubscribe;

  setTracing(
    enabled: boolean,
    opts?: { sampleRate?: number; includePayloads?: boolean }
  ): void;
}

export interface BridgeTopicDefinition {
  req?: unknown;
  res?: unknown;
  event?: unknown;
  progress?: unknown;
}

export type BridgeTopics = Record<BridgeTopic, BridgeTopicDefinition>;

export interface BridgeTraceEvent {
  id: string;
  topic: BridgeTopic;
  kind: BridgeKind;
  ts: number;
  duration?: number;
  error?: boolean;
  payload?: unknown;
}

export interface BridgeHelloRequest {
  protocol: { min: number; max: number };
  platform: 'web' | 'native';
  buildId?: string;
}

export interface BridgeHelloResponse {
  protocol: number;
  caps: {
    batching: boolean;
    coalescing: boolean;
    priorities: boolean;
    batchMaxItems: number;
    channels: BridgeChannel[];
  };
}
