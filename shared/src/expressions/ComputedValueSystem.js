import { compile } from './evaluator';
import { isExpression, } from './types';
export class ComputedValueSystem {
    cache = new Map();
    frameCache = new Map();
    currentFrameId = -1;
    compileExpression(source, debugName) {
        const cacheKey = source;
        let compiled = this.cache.get(cacheKey);
        if (!compiled) {
            compiled = compile(source);
            this.cache.set(cacheKey, compiled);
        }
        return compiled;
    }
    resolveNumber(value, ctx) {
        if (!isExpression(value)) {
            return value;
        }
        const cacheKey = value.cache === 'frame' ? value.expr : null;
        if (cacheKey && ctx.frameId === this.currentFrameId) {
            const cached = this.frameCache.get(cacheKey);
            if (cached !== undefined && typeof cached === 'number') {
                return cached;
            }
        }
        const compiled = this.compileExpression(value.expr, value.debugName);
        const result = compiled.evaluate(ctx);
        if (typeof result !== 'number') {
            console.warn(`Expression "${value.debugName ?? value.expr}" returned ${typeof result}, expected number. Using 0.`);
            return 0;
        }
        if (cacheKey) {
            this.updateFrameCache(ctx.frameId);
            this.frameCache.set(cacheKey, result);
        }
        return result;
    }
    resolveVec2(value, ctx) {
        if (!isExpression(value)) {
            return value;
        }
        const cacheKey = value.cache === 'frame' ? value.expr : null;
        if (cacheKey && ctx.frameId === this.currentFrameId) {
            const cached = this.frameCache.get(cacheKey);
            if (cached !== undefined && typeof cached === 'object' && 'x' in cached && 'y' in cached) {
                return cached;
            }
        }
        const compiled = this.compileExpression(value.expr, value.debugName);
        const result = compiled.evaluate(ctx);
        if (typeof result !== 'object' || result === null || !('x' in result) || !('y' in result)) {
            console.warn(`Expression "${value.debugName ?? value.expr}" returned ${typeof result}, expected Vec2. Using {x:0, y:0}.`);
            return { x: 0, y: 0 };
        }
        if (cacheKey) {
            this.updateFrameCache(ctx.frameId);
            this.frameCache.set(cacheKey, result);
        }
        return result;
    }
    resolveBoolean(value, ctx) {
        if (!isExpression(value)) {
            return value;
        }
        const compiled = this.compileExpression(value.expr, value.debugName);
        const result = compiled.evaluate(ctx);
        if (typeof result !== 'boolean') {
            console.warn(`Expression "${value.debugName ?? value.expr}" returned ${typeof result}, expected boolean. Using false.`);
            return false;
        }
        return result;
    }
    resolveString(value, ctx) {
        if (!isExpression(value)) {
            return value;
        }
        const compiled = this.compileExpression(value.expr, value.debugName);
        const result = compiled.evaluate(ctx);
        if (typeof result !== 'string') {
            return String(result);
        }
        return result;
    }
    updateFrameCache(frameId) {
        if (frameId !== this.currentFrameId) {
            this.frameCache.clear();
            this.currentFrameId = frameId;
        }
    }
    clearCache() {
        this.cache.clear();
        this.frameCache.clear();
        this.currentFrameId = -1;
    }
    getCompiledCount() {
        return this.cache.size;
    }
}
export function createComputedValueSystem() {
    return new ComputedValueSystem();
}
//# sourceMappingURL=ComputedValueSystem.js.map