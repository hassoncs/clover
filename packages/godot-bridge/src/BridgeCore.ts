/**
 * Unified message format for all Godot↔JS communication.
 */
export interface BridgeMessage {
  type: string;
  data?: unknown;
  id?: string;
  error?: { message: string; code?: string };
  progress?: { current: number; total?: number };
}

type MessageHandler = (data: unknown) => void;

interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: { current: number; total?: number }) => void;
  timeout: ReturnType<typeof setTimeout>;
  type: string;
  createdAt: number;
}

/**
 * Shared dispatch and request/response logic for Godot↔JS.
 * Subclasses implement send() for their specific transport.
 */
export abstract class BridgeCore {
  protected handlers = new Map<string, Set<MessageHandler>>();
  protected pending = new Map<string, PendingRequest>();
  private idCounter = 0;

  dispatch(msg: BridgeMessage): void {
    if (msg.id && (msg.type === 'response' || msg.type === 'error')) {
      const req = this.pending.get(msg.id);
      if (req) {
        clearTimeout(req.timeout);
        this.pending.delete(msg.id);
        if (msg.error) {
          const error = new Error(msg.error.message);
          (error as Error & { code?: string }).code = msg.error.code;
          req.reject(error);
        } else {
          req.resolve(msg.data);
        }
      }
      return;
    }

    if (msg.id && msg.progress) {
      const req = this.pending.get(msg.id);
      if (req?.onProgress) {
        try {
          req.onProgress(msg.progress);
        } catch (e) {
          console.warn('[BridgeCore] Progress handler error:', e);
        }
      }
      return;
    }

    const handlers = this.handlers.get(msg.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(msg.data);
        } catch (e) {
          console.warn(`[BridgeCore] Handler error for "${msg.type}":`, e);
        }
      }
    }
  }

  on(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    return () => {
      this.handlers.get(type)?.delete(handler);
      if (this.handlers.get(type)?.size === 0) {
        this.handlers.delete(type);
      }
    };
  }

  emit(type: string, data?: unknown): void {
    this.send({ type, data });
  }

  request<T>(
    type: string,
    data?: unknown,
    opts?: {
      timeoutMs?: number;
      onProgress?: (progress: { current: number; total?: number }) => void;
    }
  ): Promise<T> {
    const id = this.generateId();
    const timeoutMs = opts?.timeoutMs ?? 5000;

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request timeout: ${type} (${id})`));
      }, timeoutMs);

      this.pending.set(id, {
        resolve: resolve as (result: unknown) => void,
        reject,
        onProgress: opts?.onProgress,
        timeout,
        type,
        createdAt: Date.now(),
      });

      this.send({ type, data, id });
    });
  }

  cancelAllPending(reason: string = 'Bridge disposed'): void {
    for (const [id, req] of this.pending.entries()) {
      clearTimeout(req.timeout);
      req.reject(new Error(reason));
    }
    this.pending.clear();
  }

  clearHandlers(): void {
    this.handlers.clear();
  }

  get pendingCount(): number {
    return this.pending.size;
  }

  protected generateId(): string {
    this.idCounter++;
    return `req_${Date.now()}_${this.idCounter}_${Math.random().toString(36).slice(2, 6)}`;
  }

  protected abstract send(msg: BridgeMessage): void;
}
