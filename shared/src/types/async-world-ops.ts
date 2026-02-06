import type { AnimateTarget, AnimateOptions, WaitOptions } from './world-ops';

/**
 * Asynchronous world operations for multi-frame work.
 * Only animate and wait are truly async (multi-frame).
 * Used via ctx.worldAsync or ctx.startSequence.
 */
export interface AsyncWorldOps {
  animate(entityId: string, target: AnimateTarget, opts: AnimateOptions): Promise<void>;
  wait(ms: number, opts?: WaitOptions): Promise<void>;
}
