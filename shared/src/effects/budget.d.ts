import type { CompiledPlan, PlatformTier, BudgetTierPolicy } from './types';
export declare const BUDGET_TIER_PRESETS: Record<PlatformTier, BudgetTierPolicy>;
export type BudgetViolationCode = 'E_TOO_MANY_PASSES' | 'E_RESOLUTION_TOO_HIGH' | 'E_TOO_MANY_BUFFERS' | 'E_FEEDBACK_BUDGET';
export interface BudgetViolation {
    code: BudgetViolationCode;
    message: string;
    limit: number;
    actual: number;
}
export interface BudgetMetrics {
    passCount: number;
    bufferCount: number;
    feedbackBufferCount: number;
    maxResolutionScale: number;
    estimatedMemoryMB: number;
}
export interface BudgetCheckResult {
    withinBudget: boolean;
    violations: BudgetViolation[];
    metrics: BudgetMetrics;
}
export declare function checkBudget(plan: CompiledPlan, tier: PlatformTier): BudgetCheckResult;
export interface PerformanceMetrics {
    compileTimeMs: number;
    frameTimeMs: number;
    resourceMemoryMB: number;
    passExecutionTimes: Record<string, number>;
}
interface ThresholdCheckResult {
    passed: boolean;
    violations: string[];
}
interface ThresholdConfig {
    maxFrameTimeMs?: number;
    maxMemoryMB?: number;
}
export declare class PerformanceHarness {
    private store;
    private ensureEntry;
    recordCompileTime(planId: string, timeMs: number): void;
    recordFrameTime(planId: string, timeMs: number): void;
    recordResourceMemory(planId: string, memoryMB: number): void;
    getMetrics(planId: string): PerformanceMetrics | undefined;
    checkThresholds(planId: string, thresholds: ThresholdConfig): ThresholdCheckResult;
    reset(): void;
}
export {};
//# sourceMappingURL=budget.d.ts.map