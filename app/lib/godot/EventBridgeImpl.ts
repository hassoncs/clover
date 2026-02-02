/**
 * EventBridge Runtime Implementation
 *
 * Provides TypeScript ↔ Godot communication using the EventBridge protocol.
 * Supports events, requests with progress, and subscriptions with transport adapters.
 */

import type {
  EventBridge,
  BridgeEnvelopeV1,
  BridgeEnvelopeMeta,
  BridgeEnvelopeError,
  BridgeTopic,
  BridgeChannel,
  BridgeKind,
  BridgeDirection,
  BridgeTraceEvent,
  Unsubscribe,
} from './EventBridge';

/**
 * Transport adapter interface for sending envelopes to Godot.
 * Implement this for web (window/iframe) or native (JSI) transport.
 */
export interface TransportAdapter {
  /** Send an envelope to Godot and get response synchronously */
  send(envelope: BridgeEnvelopeV1): BridgeEnvelopeV1 | null;
  /** Send an envelope asynchronously (for requests) */
  sendAsync(envelope: BridgeEnvelopeV1): Promise<BridgeEnvelopeV1>;
  /** Subscribe to incoming events from Godot */
  onEvent(callback: (envelope: BridgeEnvelopeV1) => void): Unsubscribe;
  /** Get the platform identifier */
  platform: 'web' | 'native';
}

/**
 * Pending request record for correlation tracking.
 */
interface PendingRequest<TRes = unknown, TProgress = unknown> {
  resolve: (value: TRes) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  onProgress?: (progress: TProgress) => void;
  createdAt: number;
  topic: BridgeTopic;
}

/**
 * Default timeout for requests (5 seconds).
 */
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Default tracing sample rate (100% in debug mode).
 */
const DEFAULT_SAMPLE_RATE = process.env.NODE_ENV === 'development' ? 1.0 : 0.01;

/**
 * Generate a unique correlation ID for requests.
 */
function generateId(): string {
  return `eb_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Create envelope metadata with tracing information.
 */
function createMeta(
  transport: TransportAdapter,
  topic: BridgeTopic,
  opts?: { channel?: BridgeChannel | string; priority?: number }
): BridgeEnvelopeMeta {
  return {
    dir: 'js->godot' as BridgeDirection,
    platform: transport.platform,
    channel: opts?.channel ?? 'default',
    priority: (opts?.priority ?? 1) as 0 | 1 | 2 | 3,
    dropped: 0,
  };
}

/**
 * EventBridge Runtime Implementation
 */
export class EventBridgeImpl implements EventBridge {
  private transport: TransportAdapter;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private eventHandlers: Map<string, Set<(payload: unknown, meta: BridgeEnvelopeV1) => void>> = new Map();
  private unsubscribers: Set<() => void> = new Set();
  private tracingEnabled = false;
  private traceSampleRate = DEFAULT_SAMPLE_RATE;
  private includePayloadsInTrace = false;
  private traceEvents: BridgeTraceEvent[] = [];
  private maxTraceEvents = 1000;
  private isDisposed = false;

  constructor(transport: TransportAdapter) {
    if (!transport) {
      throw new Error('[EventBridge] Transport adapter is required');
    }

    this.transport = transport;

    // Set up incoming event listener
    const unsubscribe = transport.onEvent((envelope) => {
      this.handleIncomingEnvelope(envelope);
    });

    this.unsubscribers.add(unsubscribe);

    console.log(`[EventBridge] Initialized with ${transport.platform} transport`);
  }

  /**
   * Handle an incoming envelope from Godot.
   */
  private handleIncomingEnvelope(envelope: BridgeEnvelopeV1): void {
    if (this.isDisposed) return;

    const startTime = performance.now();

    // Trace the event
    this.traceEnvelope(envelope, 'godot->js', startTime);

    // Route based on envelope kind
    switch (envelope.kind) {
      case 'response':
      case 'progress':
        this.handleResponseEnvelope(envelope);
        break;

      case 'event':
        this.dispatchEvent(envelope);
        break;

      default:
        console.warn(`[EventBridge] Unknown envelope kind: ${envelope.kind}`);
    }
  }

  /**
   * Handle a response or progress envelope from Godot.
   */
  private handleResponseEnvelope(envelope: BridgeEnvelopeV1): void {
    const pending = this.pendingRequests.get(envelope.id);

    if (!pending) {
      console.warn(`[EventBridge] No pending request for id: ${envelope.id}`);
      return;
    }

    if (envelope.kind === 'progress') {
      // Handle progress update
      if (pending.onProgress && envelope.payload !== undefined) {
        try {
          pending.onProgress(envelope.payload as Parameters<typeof pending.onProgress>[0]);
        } catch (e) {
          console.warn('[EventBridge] Progress callback error:', e);
        }
      }
      return;
    }

    // Handle final response
    clearTimeout(pending.timeout);
    this.pendingRequests.delete(envelope.id);

    if (envelope.error) {
      const error = new Error(envelope.error.message);
      error.name = envelope.error.code;
      (error as { data?: unknown }).data = envelope.error.data;
      pending.reject(error);
    } else {
      try {
        pending.resolve(envelope.payload as Awaited<typeof pending>['resolve'] extends (value: infer T) => void ? T : never);
      } catch (e) {
        pending.reject(new Error(`Response parse error: ${e}`));
      }
    }
  }

  /**
   * Dispatch an event to registered handlers.
   */
  private dispatchEvent(envelope: BridgeEnvelopeV1): void {
    const handlers = this.eventHandlers.get(envelope.topic);

    if (!handlers || handlers.size === 0) {
      return;
    }

    for (const handler of Array.from(handlers)) {
      try {
        handler(envelope.payload, envelope);
      } catch (e) {
        console.warn(`[EventBridge] Event handler error for topic "${envelope.topic}":`, e);
      }
    }
  }

  /**
   * Trace an envelope for debugging.
   */
  private traceEnvelope(envelope: BridgeEnvelopeV1, direction: BridgeDirection, startTime: number): void {
    if (!this.tracingEnabled) return;

    // Sample check
    if (Math.random() > this.traceSampleRate) return;

    const duration = performance.now() - startTime;

    const traceEvent: BridgeTraceEvent = {
      id: envelope.id,
      topic: envelope.topic,
      kind: envelope.kind,
      ts: envelope.ts,
      duration,
      error: !!envelope.error,
      payload: this.includePayloadsInTrace ? envelope.payload : undefined,
    };

    this.traceEvents.push(traceEvent);

    // Limit trace events
    if (this.traceEvents.length > this.maxTraceEvents) {
      this.traceEvents = this.traceEvents.slice(-this.maxTraceEvents);
    }

    // Log to console in debug mode
    if (process.env.NODE_ENV === 'development') {
      const prefix = direction === 'js->godot' ? '→' : '←';
      const errorMark = envelope.error ? ' ❌' : '';
      const payloadPreview = envelope.payload
        ? typeof envelope.payload === 'string'
          ? envelope.payload.slice(0, 50)
          : JSON.stringify(envelope.payload).slice(0, 50)
        : '';

      console.log(
        `[EventBridge] ${prefix} ${envelope.kind} ${envelope.topic}${errorMark} (${duration.toFixed(2)}ms)${payloadPreview ? ` ${payloadPreview}` : ''}`
      );
    }
  }

  /**
   * Create an envelope with proper structure.
   */
  private createEnvelope<TPayload>(
    topic: BridgeTopic,
    kind: BridgeKind,
    payload: TPayload,
    id?: string,
    opts?: { channel?: BridgeChannel | string; priority?: number }
  ): BridgeEnvelopeV1 {
    return {
      v: 1,
      kind,
      id: id ?? generateId(),
      topic,
      ts: Date.now(),
      payload,
      meta: createMeta(this.transport, topic, opts),
    };
  }

  publish<TPayload>(
    topic: BridgeTopic,
    payload: TPayload,
    opts?: { channel?: BridgeChannel | string; priority?: number }
  ): void {
    if (this.isDisposed) {
      console.warn('[EventBridge] Cannot publish on disposed bridge');
      return;
    }

    const envelope = this.createEnvelope(topic, 'event', payload, undefined, opts);
    const startTime = performance.now();

    try {
      this.transport.send(envelope);
      this.traceEnvelope(envelope, 'js->godot', startTime);
    } catch (e) {
      console.error('[EventBridge] Publish error:', e);
    }
  }

  async request<TReq, TRes>(
    topic: BridgeTopic,
    payload: TReq,
    opts?: { timeoutMs?: number; signal?: AbortSignal }
  ): Promise<TRes> {
    if (this.isDisposed) {
      return Promise.reject(new Error('EventBridge is disposed'));
    }

    const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const id = generateId();
    const envelope = this.createEnvelope<TReq>(topic, 'request', payload, id);
    const startTime = performance.now();

    // Set up abort signal handling
    const signal = opts?.signal;
    let aborted = false;
    let abortHandler: () => void;

    const abortPromise = new Promise<never>((_, reject) => {
      abortHandler = () => {
        aborted = true;
        reject(new Error('Request aborted'));
      };
      signal?.addEventListener('abort', abortHandler);
    });

    return new Promise((resolve, reject) => {
      // Create timeout handler
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${topic} (${id})`));
      }, timeoutMs);

      // Store pending request
      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
        createdAt: Date.now(),
        topic,
      });

      // Send the request
      try {
        this.transport.sendAsync(envelope).then((response) => {
          if (aborted) return;
          this.handleIncomingEnvelope(response);
        }).catch((e) => {
          if (aborted) return;
          clearTimeout(timeout);
          this.pendingRequests.delete(id);
          reject(e);
        });

        this.traceEnvelope(envelope, 'js->godot', startTime);
      } catch (e) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(e);
      }
    });
  }

  async requestWithProgress<TReq, TProgress, TRes>(
    topic: BridgeTopic,
    payload: TReq,
    onProgress: (progress: TProgress) => void,
    opts?: { timeoutMs?: number; signal?: AbortSignal }
  ): Promise<TRes> {
    if (this.isDisposed) {
      return Promise.reject(new Error('EventBridge is disposed'));
    }

    const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const id = generateId();
    const envelope = this.createEnvelope<TReq>(topic, 'request', payload, id);
    const startTime = performance.now();

    // Set up abort signal handling
    const signal = opts?.signal;
    let aborted = false;
    let abortHandler: () => void;

    const abortPromise = new Promise<never>((_, reject) => {
      abortHandler = () => {
        aborted = true;
        reject(new Error('Request aborted'));
      };
      signal?.addEventListener('abort', abortHandler);
    });

    return new Promise((resolve, reject) => {
      // Create timeout handler
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request with progress timeout: ${topic} (${id})`));
      }, timeoutMs);

      // Store pending request with progress callback
      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
        onProgress: onProgress as (progress: unknown) => void,
        createdAt: Date.now(),
        topic,
      });

      // Send the request
      try {
        this.transport.sendAsync(envelope).then((response) => {
          if (aborted) return;
          this.handleIncomingEnvelope(response);
        }).catch((e) => {
          if (aborted) return;
          clearTimeout(timeout);
          this.pendingRequests.delete(id);
          reject(e);
        });

        this.traceEnvelope(envelope, 'js->godot', startTime);
      } catch (e) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(e);
      }
    });
  }

  subscribe<TPayload>(
    topic: BridgeTopic,
    handler: (payload: TPayload, meta: BridgeEnvelopeV1) => void
  ): Unsubscribe {
    if (this.isDisposed) {
      console.warn('[EventBridge] Cannot subscribe on disposed bridge');
      return () => {};
    }

    // Get or create handler set for this topic
    let handlers = this.eventHandlers.get(topic);

    if (!handlers) {
      handlers = new Set();
      this.eventHandlers.set(topic, handlers);
    }

    // Wrap handler with type safety
    const wrappedHandler = (payload: unknown, meta: BridgeEnvelopeV1) => {
      handler(payload as TPayload, meta);
    };

    handlers.add(wrappedHandler);

    // Return unsubscribe function
    const unsubscribe = () => {
      handlers?.delete(wrappedHandler);
      if (handlers && handlers.size === 0) {
        this.eventHandlers.delete(topic);
      }
    };

    this.unsubscribers.add(unsubscribe);

    return unsubscribe;
  }

  setTracing(
    enabled: boolean,
    opts?: { sampleRate?: number; includePayloads?: boolean }
  ): void {
    this.tracingEnabled = enabled;
    this.traceSampleRate = opts?.sampleRate ?? DEFAULT_SAMPLE_RATE;
    this.includePayloadsInTrace = opts?.includePayloads ?? false;

    if (!enabled) {
      this.traceEvents = [];
    }

    console.log(`[EventBridge] Tracing ${enabled ? 'enabled' : 'disabled'} (sample: ${(this.traceSampleRate * 100).toFixed(1)}%)`);
  }

  /**
   * Get recent trace events for debugging.
   */
  getTraceEvents(): BridgeTraceEvent[] {
    return [...this.traceEvents];
  }

  /**
   * Clear trace events.
   */
  clearTraceEvents(): void {
    this.traceEvents = [];
  }

  /**
   * Dispose the EventBridge and clean up resources.
   */
  dispose(): void {
    if (this.isDisposed) return;

    this.isDisposed = true;

    // Clear all pending requests
    for (const [id, pending] of Array.from(this.pendingRequests.entries())) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('EventBridge disposed'));
    }
    this.pendingRequests.clear();

    // Clear event handlers
    this.eventHandlers.clear();

    // Call all unsubscribers
    for (const unsubscribe of Array.from(this.unsubscribers)) {
      try {
        unsubscribe();
      } catch (e) {
        console.warn('[EventBridge] Unsubscribe error:', e);
      }
    }
    this.unsubscribers.clear();

    console.log('[EventBridge] Disposed');
  }

  /**
   * Check if the bridge is disposed.
   */
  get isActive(): boolean {
    return !this.isDisposed;
  }

  /**
   * Get the number of pending requests.
   */
  get pendingRequestCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Get the transport platform.
   */
  get platform(): 'web' | 'native' {
    return this.transport.platform;
  }
}

/**
 * Create an EventBridge instance with the given transport adapter.
 */
export function createEventBridge(transport: TransportAdapter): EventBridge {
  return new EventBridgeImpl(transport);
}
