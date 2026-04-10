// ---------------------------------------------------------------------------
// Built-in tier presets
// ---------------------------------------------------------------------------
export const BUDGET_TIER_PRESETS = {
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
// Resolution mode → numeric scale
// ---------------------------------------------------------------------------
const RESOLUTION_SCALE = {
    full: 1.0,
    half: 0.5,
    quarter: 0.25,
    custom: 1.0,
};
function resolutionToScale(resolution) {
    return RESOLUTION_SCALE[resolution] ?? 1.0;
}
// ---------------------------------------------------------------------------
// Memory estimation constants (1920×1080 base)
// ---------------------------------------------------------------------------
const BASE_PIXELS = 1920 * 1080;
const BYTES_PER_PIXEL_RGBA8 = 4;
const BYTES_PER_PIXEL_RGBA16F = 8;
const MB = 1024 * 1024;
function estimateBufferMemoryMB(resource) {
    const scale = resolutionToScale(resource.resolution);
    const pixels = BASE_PIXELS * scale * scale;
    const bytesPerPixel = resource.format === 'rgba16f' ? BYTES_PER_PIXEL_RGBA16F : BYTES_PER_PIXEL_RGBA8;
    return (pixels * bytesPerPixel) / MB;
}
// ---------------------------------------------------------------------------
// Budget buffer limit — derived from tier maxPasses with headroom
// ---------------------------------------------------------------------------
function bufferLimitForTier(policy) {
    return policy.maxPasses * 2;
}
function feedbackLimitForTier(policy) {
    return Math.max(1, Math.floor(policy.maxPasses / 4));
}
// ---------------------------------------------------------------------------
// checkBudget — enforce platform profile limits on a compiled plan
// ---------------------------------------------------------------------------
export function checkBudget(plan, tier) {
    const policy = BUDGET_TIER_PRESETS[tier];
    const violations = [];
    const passCount = plan.passes.length;
    const resources = Object.values(plan.resourceMap);
    const bufferCount = resources.length;
    const feedbackBufferCount = Object.keys(plan.feedbackPolicies).length;
    const maxResolutionScale = resources.length > 0
        ? Math.max(...resources.map((r) => resolutionToScale(r.resolution)))
        : 0;
    const estimatedMemoryMB = resources.reduce((sum, r) => sum + estimateBufferMemoryMB(r), 0);
    const metrics = {
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
function defaultMetrics() {
    return {
        compileTimeMs: 0,
        frameTimeMs: 0,
        resourceMemoryMB: 0,
        passExecutionTimes: {},
    };
}
export class PerformanceHarness {
    store = new Map();
    ensureEntry(planId) {
        let entry = this.store.get(planId);
        if (!entry) {
            entry = defaultMetrics();
            this.store.set(planId, entry);
        }
        return entry;
    }
    recordCompileTime(planId, timeMs) {
        this.ensureEntry(planId).compileTimeMs = timeMs;
    }
    recordFrameTime(planId, timeMs) {
        this.ensureEntry(planId).frameTimeMs = timeMs;
    }
    recordResourceMemory(planId, memoryMB) {
        this.ensureEntry(planId).resourceMemoryMB = memoryMB;
    }
    getMetrics(planId) {
        return this.store.get(planId);
    }
    checkThresholds(planId, thresholds) {
        const metrics = this.store.get(planId);
        if (!metrics) {
            return { passed: true, violations: [] };
        }
        const violations = [];
        if (thresholds.maxFrameTimeMs !== undefined &&
            metrics.frameTimeMs > thresholds.maxFrameTimeMs) {
            violations.push(`Exceeded frame time budget: ${metrics.frameTimeMs}ms > ${thresholds.maxFrameTimeMs}ms`);
        }
        if (thresholds.maxMemoryMB !== undefined &&
            metrics.resourceMemoryMB > thresholds.maxMemoryMB) {
            violations.push(`Exceeded memory budget: ${metrics.resourceMemoryMB}MB > ${thresholds.maxMemoryMB}MB`);
        }
        return {
            passed: violations.length === 0,
            violations,
        };
    }
    reset() {
        this.store.clear();
    }
}
//# sourceMappingURL=budget.js.map