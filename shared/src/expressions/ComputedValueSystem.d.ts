import { type CompiledExpression, type EvalContext, type Value, type Vec2 } from './types';
export declare class ComputedValueSystem {
    private cache;
    private frameCache;
    private currentFrameId;
    compileExpression(source: string, debugName?: string): CompiledExpression;
    resolveNumber(value: Value<number>, ctx: EvalContext): number;
    resolveVec2(value: Value<Vec2>, ctx: EvalContext): Vec2;
    resolveBoolean(value: Value<boolean>, ctx: EvalContext): boolean;
    resolveString(value: Value<string>, ctx: EvalContext): string;
    private updateFrameCache;
    clearCache(): void;
    getCompiledCount(): number;
}
export declare function createComputedValueSystem(): ComputedValueSystem;
//# sourceMappingURL=ComputedValueSystem.d.ts.map