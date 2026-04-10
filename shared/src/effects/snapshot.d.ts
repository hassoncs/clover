import type { CompiledPlan } from './types';
export interface FeedbackSnapshotState {
    currentReadIndex: 0 | 1;
    currentWriteIndex: 0 | 1;
    frameCount: number;
    frozen: boolean;
    initialized: boolean;
}
export interface EffectsSnapshot {
    planHash: string;
    graphId: string;
    graphVersion: string;
    passParams: Record<string, Record<string, unknown>>;
    feedbackStates: Record<string, FeedbackSnapshotState>;
    lifecycleState: string;
    timestamp: number;
    snapshotVersion: 1;
}
export type SnapshotCompatibilityErrorCode = 'E_HASH_MISMATCH' | 'E_VERSION_MISMATCH' | 'E_MISSING_PASS' | 'E_EXTRA_PASS' | 'E_MISSING_FEEDBACK' | 'E_SNAPSHOT_CORRUPT';
export interface SnapshotCompatibilityError {
    code: SnapshotCompatibilityErrorCode;
    message: string;
    details?: Record<string, unknown>;
}
export interface SnapshotCompatibility {
    compatible: boolean;
    errors: SnapshotCompatibilityError[];
}
type RestoreSuccess = {
    success: true;
    passParams: Record<string, Record<string, unknown>>;
    feedbackStates: Record<string, FeedbackSnapshotState>;
};
type RestoreFailure = {
    success: false;
    errors: SnapshotCompatibilityError[];
};
export type RestoreResult = RestoreSuccess | RestoreFailure;
export declare class SnapshotManager {
    capture(plan: CompiledPlan, passParams: Record<string, Record<string, unknown>>, feedbackStates: Record<string, FeedbackSnapshotState>, lifecycleState: string): EffectsSnapshot;
    checkCompatibility(snapshot: EffectsSnapshot, currentPlan: CompiledPlan): SnapshotCompatibility;
    restore(snapshot: EffectsSnapshot, currentPlan: CompiledPlan): RestoreResult;
    validate(snapshot: unknown): snapshot is EffectsSnapshot;
}
export {};
//# sourceMappingURL=snapshot.d.ts.map