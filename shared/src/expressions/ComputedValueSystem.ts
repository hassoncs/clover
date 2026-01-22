import { compile } from './evaluator';
import {
  isExpression,
  type CompiledExpression,
  type EvalContext,
  type ExpressionValueType,
  type Value,
  type Vec2,
} from './types';

type CompiledExpressionCache = Map<string, CompiledExpression>;

export class ComputedValueSystem {
  private cache: CompiledExpressionCache = new Map();
  private frameCache: Map<string, ExpressionValueType> = new Map();
  private currentFrameId = -1;

  compileExpression(source: string, debugName?: string): CompiledExpression {
    const cacheKey = source;
    let compiled = this.cache.get(cacheKey);

    if (!compiled) {
      compiled = compile(source);
      this.cache.set(cacheKey, compiled);
    }

    return compiled;
  }

  resolveNumber(value: Value<number>, ctx: EvalContext): number {
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
      console.warn(
        `Expression "${value.debugName ?? value.expr}" returned ${typeof result}, expected number. Using 0.`
      );
      return 0;
    }

    if (cacheKey) {
      this.updateFrameCache(ctx.frameId);
      this.frameCache.set(cacheKey, result);
    }

    return result;
  }

  resolveVec2(value: Value<Vec2>, ctx: EvalContext): Vec2 {
    if (!isExpression(value)) {
      return value;
    }

    const cacheKey = value.cache === 'frame' ? value.expr : null;
    if (cacheKey && ctx.frameId === this.currentFrameId) {
      const cached = this.frameCache.get(cacheKey);
      if (cached !== undefined && typeof cached === 'object' && 'x' in cached && 'y' in cached) {
        return cached as Vec2;
      }
    }

    const compiled = this.compileExpression(value.expr, value.debugName);
    const result = compiled.evaluate(ctx);

    if (typeof result !== 'object' || result === null || !('x' in result) || !('y' in result)) {
      console.warn(
        `Expression "${value.debugName ?? value.expr}" returned ${typeof result}, expected Vec2. Using {x:0, y:0}.`
      );
      return { x: 0, y: 0 };
    }

    if (cacheKey) {
      this.updateFrameCache(ctx.frameId);
      this.frameCache.set(cacheKey, result as Vec2);
    }

    return result as Vec2;
  }

  resolveBoolean(value: Value<boolean>, ctx: EvalContext): boolean {
    if (!isExpression(value)) {
      return value;
    }

    const compiled = this.compileExpression(value.expr, value.debugName);
    const result = compiled.evaluate(ctx);

    if (typeof result !== 'boolean') {
      console.warn(
        `Expression "${value.debugName ?? value.expr}" returned ${typeof result}, expected boolean. Using false.`
      );
      return false;
    }

    return result;
  }

  resolveString(value: Value<string>, ctx: EvalContext): string {
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

  private updateFrameCache(frameId: number): void {
    if (frameId !== this.currentFrameId) {
      this.frameCache.clear();
      this.currentFrameId = frameId;
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.frameCache.clear();
    this.currentFrameId = -1;
  }

  getCompiledCount(): number {
    return this.cache.size;
  }
}

export function createComputedValueSystem(): ComputedValueSystem {
  return new ComputedValueSystem();
}
