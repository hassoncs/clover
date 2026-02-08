import type { CompiledPlan, ResourceRef, PlatformTier, BudgetTierPolicy } from './types';

// ---------------------------------------------------------------------------
// Built-in tier presets
// ---------------------------------------------------------------------------

export const BUDGET_TIER_PRESETS: Record<PlatformTier, BudgetTierPolicy> = {
  'web-high': {
    maxPasses: 16,
    maxResolutionScale: 1.0,
    minCadence: 1,
  },
  'web-low': {
    maxPasses: 8,
    maxResolutionScale: 0.75,
    minCadence: 2,
  },
  'mobile-high': {
    maxPasses: 8,
    maxResolutionScale: 0.75,
    minCadence: 1,
  },
  'mobile-low': {
    maxPasses: 4,
    maxResolutionScale: 0.5,
    minCadence: 3,
  },
};

// ---------------------------------------------------------------------------
// Budget check types
// ---------------------------------------------------------------------------

export type BudgetViolationCode =
  | 'E_TOO_MANY_PASSES'
  | 'E_RESOLUTION_TOO_HIGH'
  | 'E_TOO_MANY_BUFFERS'
  | 'E_FEEDBACK_BUDGET';

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

// ---------------------------------------------------------------------------
// Resolution mode → numeric scale
// ---------------------------------------------------------------------------

const RESOLUTION_SCALE: Record<string, number> = {
  full: 1.0,
  half: 0.5,
  quarter: 0.25,
  custom: 1.0,
};

function resolutionToScale(resolution: string): number {
  return RESOLUTION_SCALE[resolution] ?? 1.0;
}

// ---------------------------------------------------------------------------
// Memory estimation constants (1920×1080 base)
// ---------------------------------------------------------------------------

const BASE_PIXELS = 1920 * 1080;
const BYTES_PER_PIXEL_RGBA8 = 4;
const BYTES_PER_PIXEL_RGBA16F = 8;
const MB = 1024 * 1024;

function estimateBufferMemoryMB(resource: ResourceRef): number {
  const scale = resolutionToScale(resource.resolution);
  const pixels = BASE_PIXELS * scale * scale;
  const bytesPerPixel =
    resource.format === 'rgba16f' ? BYTES_PER_PIXEL_RGBA16F : BYTES_PER_PIXEL_RGBA8;
  return (pixels * bytesPerPixel) / MB;
}

// ---------------------------------------------------------------------------
// Budget buffer limit — derived from tier maxPasses with headroom
// ---------------------------------------------------------------------------

function bufferLimitForTier(policy: BudgetTierPolicy): number {
  return policy.maxPasses * 2;
}

function feedbackLimitForTier(policy: BudgetTierPolicy): number {
  return Math.max(1, Math.floor(policy.maxPasses / 4));
}

// ---------------------------------------------------------------------------
// checkBudget — enforce platform profile limits on a compiled plan
// ---------------------------------------------------------------------------

export function checkBudget(plan: CompiledPlan, tier: PlatformTier): BudgetCheckResult {
  const policy = BUDGET_TIER_PRESETS[tier];
  const violations: BudgetViolation[] = [];

  const passCount = plan.passes.length;
  const resources = Object.values(plan.resourceMap);
  const bufferCount = resources.length;
  const feedbackBufferCount = Object.keys(plan.feedbackPolicies).length;

  const maxResolutionScale =
    resources.length > 0
      ? Math.max(...resources.map((r) => resolutionToScale(r.resolution)))
      : 0;

  const estimatedMemoryMB = resources.reduce(
    (sum, r) => sum + estimateBufferMemoryMB(r),
    0,
  );

  const metrics: BudgetMetrics = {
    passCount,
    bufferCount,
    feedbackBufferCount,
    maxResolutionScale,
    estimatedMemoryMB,
  };

  if (passCount > policy.maxPasses) {
    violations.push({
      code: 'E_TOO_MANY_PASSES',
      message: `Plan has ${passCount} passes but ${tier} allows max ${policy.maxPasses}`,
      limit: policy.maxPasses,
      actual: passCount,
    });
  }

  if (maxResolutionScale > policy.maxResolutionScale) {
    violations.push({
      code: 'E_RESOLUTION_TOO_HIGH',
      message: `Max resolution scale ${maxResolutionScale} exceeds ${tier} limit of ${policy.maxResolutionScale}`,
      limit: policy.maxResolutionScale,
      actual: maxResolutionScale,
    });
  }

  const maxBuffers = bufferLimitForTier(policy);
  if (bufferCount > maxBuffers) {
    violations.push({
      code: 'E_TOO_MANY_BUFFERS',
      message: `Plan uses ${bufferCount} buffers but ${tier} allows max ${maxBuffers}`,
      limit: maxBuffers,
      actual: bufferCount,
    });
  }

  const maxFeedback = feedbackLimitForTier(policy);
  if (feedbackBufferCount > maxFeedback) {
    violations.push({
      code: 'E_FEEDBACK_BUDGET',
      message: `Plan uses ${feedbackBufferCount} feedback buffers but ${tier} allows max ${maxFeedback}`,
      limit: maxFeedback,
      actual: feedbackBufferCount,
    });
  }

  return {
    withinBudget: violations.length === 0,
    violations,
    metrics,
  };
}

// ---------------------------------------------------------------------------
// Performance metrics harness
// ---------------------------------------------------------------------------

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

function defaultMetrics(): PerformanceMetrics {
  return {
    compileTimeMs: 0,
    frameTimeMs: 0,
    resourceMemoryMB: 0,
    passExecutionTimes: {},
  };
}

export class PerformanceHarness {
  private store = new Map<string, PerformanceMetrics>();

  private ensureEntry(planId: string): PerformanceMetrics {
    let entry = this.store.get(planId);
    if (!entry) {
      entry = defaultMetrics();
      this.store.set(planId, entry);
    }
    return entry;
  }

  recordCompileTime(planId: string, timeMs: number): void {
    this.ensureEntry(planId).compileTimeMs = timeMs;
  }

  recordFrameTime(planId: string, timeMs: number): void {
    this.ensureEntry(planId).frameTimeMs = timeMs;
  }

  recordResourceMemory(planId: string, memoryMB: number): void {
    this.ensureEntry(planId).resourceMemoryMB = memoryMB;
  }

  getMetrics(planId: string): PerformanceMetrics | undefined {
    return this.store.get(planId);
  }

  checkThresholds(planId: string, thresholds: ThresholdConfig): ThresholdCheckResult {
    const metrics = this.store.get(planId);
    if (!metrics) {
      return { passed: true, violations: [] };
    }

    const violations: string[] = [];

    if (
      thresholds.maxFrameTimeMs !== undefined &&
      metrics.frameTimeMs > thresholds.maxFrameTimeMs
    ) {
      violations.push(
        `Exceeded frame time budget: ${metrics.frameTimeMs}ms > ${thresholds.maxFrameTimeMs}ms`,
      );
    }

    if (
      thresholds.maxMemoryMB !== undefined &&
      metrics.resourceMemoryMB > thresholds.maxMemoryMB
    ) {
      violations.push(
        `Exceeded memory budget: ${metrics.resourceMemoryMB}MB > ${thresholds.maxMemoryMB}MB`,
      );
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }

  reset(): void {
    this.store.clear();
  }
}
