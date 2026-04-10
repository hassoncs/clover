import type { FeedbackPolicy } from './types';
export interface FeedbackBufferState {
    id: string;
    policy: FeedbackPolicy;
    currentReadIndex: 0 | 1;
    currentWriteIndex: 0 | 1;
    initialized: boolean;
    frameCount: number;
    frozen: boolean;
}
export declare class FeedbackManager {
    private buffers;
    register(id: string, policy: FeedbackPolicy): void;
    unregister(id: string): boolean;
    initialize(id: string): void;
    getState(id: string): FeedbackBufferState | undefined;
    swap(id: string): void;
    stop(id: string): void;
    resume(id: string): void;
    reset(id: string): void;
    isReadable(id: string): boolean;
    getAllIds(): string[];
    validate(): {
        valid: boolean;
        errors: string[];
    };
    getFrameCount(id: string): number;
}
//# sourceMappingURL=feedback.d.ts.map