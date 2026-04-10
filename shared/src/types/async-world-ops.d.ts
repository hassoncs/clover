import type { VoiceHandleId, VoiceWaitOptions, VoiceWaitResult } from "./voice-handle";
import type { AnimateOptions, AnimateTarget, WaitOptions } from "./world-ops";
/**
 * Asynchronous world operations for multi-frame work.
 * Only animate and wait are truly async (multi-frame).
 * Used via ctx.worldAsync or ctx.startSequence.
 */
export interface AsyncWorldOps {
    animate(entityId: string, target: AnimateTarget, opts: AnimateOptions): Promise<void>;
    wait(ms: number, opts?: WaitOptions): Promise<void>;
    waitForVoices(handleIds: VoiceHandleId[], opts?: VoiceWaitOptions): Promise<VoiceWaitResult>;
}
//# sourceMappingURL=async-world-ops.d.ts.map