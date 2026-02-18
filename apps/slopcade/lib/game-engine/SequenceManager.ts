import type { WorldOps, SequenceHandle } from '@slopcade/shared/types/world-ops';

export class SequenceCancelledError extends Error {
  constructor(sequenceName: string) {
    super(`Sequence "${sequenceName}" was cancelled`);
    this.name = 'SequenceCancelledError';
  }
}

interface ActiveSequence {
  name: string;
  abortController: AbortController;
  promise: Promise<void>;
}

function createCancellableWorldOps(
  worldOps: WorldOps,
  abortController: AbortController,
  sequenceName: string
): WorldOps {
  const checkAborted = () => {
    if (abortController.signal.aborted) {
      throw new SequenceCancelledError(sequenceName);
    }
  };

  return new Proxy(worldOps, {
    get(target, prop) {
      const value = target[prop as keyof WorldOps];
      
      if (typeof value === 'function') {
        return async (...args: unknown[]) => {
          checkAborted();
          
          const promise = (value as (...args: unknown[]) => Promise<unknown>).apply(target, args);
          
          if (abortController.signal.aborted) {
            throw new SequenceCancelledError(sequenceName);
          }
          
          return new Promise((resolve, reject) => {
            const abortHandler = () => {
              reject(new SequenceCancelledError(sequenceName));
            };
            
            abortController.signal.addEventListener('abort', abortHandler);
            
            promise.then(
              (result) => {
                abortController.signal.removeEventListener('abort', abortHandler);
                resolve(result);
              },
              (error) => {
                abortController.signal.removeEventListener('abort', abortHandler);
                reject(error);
              }
            );
          });
        };
      }
      
      return value;
    },
  });
}

export class SequenceManager {
  private activeSequences: Map<string, ActiveSequence> = new Map();

  start(
    name: string,
    fn: (world: WorldOps) => Promise<void>,
    worldOps: WorldOps
  ): SequenceHandle {
    if (this.activeSequences.has(name)) {
      this.cancel(name);
    }

    const abortController = new AbortController();
    const cancellableWorldOps = createCancellableWorldOps(worldOps, abortController, name);

    const promise = fn(cancellableWorldOps)
      .catch((err) => {
        if (err instanceof SequenceCancelledError) {
          return;
        }
        console.error(`[SequenceManager] Error in sequence "${name}":`, err);
      })
      .finally(() => {
        this.activeSequences.delete(name);
      });

    const activeSequence: ActiveSequence = {
      name,
      abortController,
      promise,
    };

    this.activeSequences.set(name, activeSequence);

    const self = this;
    const handle: SequenceHandle = {
      name,
      get isRunning() {
        return self.activeSequences.has(name);
      },
      cancel: () => this.cancel(name),
    };

    return handle;
  }

  isRunning(name: string): boolean {
    return this.activeSequences.has(name);
  }

  cancel(name: string): void {
    const sequence = this.activeSequences.get(name);
    if (sequence) {
      sequence.abortController.abort();
    }
  }

  cancelAll(): void {
    for (const name of Array.from(this.activeSequences.keys())) {
      this.cancel(name);
    }
  }

  dispose(): void {
    this.cancelAll();
  }
}
