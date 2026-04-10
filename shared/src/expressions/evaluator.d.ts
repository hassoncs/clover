import type { EvalContext, ExpressionValueType, CompiledExpression } from './types';
export declare function compile<T extends ExpressionValueType = ExpressionValueType>(source: string): CompiledExpression<T>;
export declare function evaluate(source: string, ctx: EvalContext): ExpressionValueType;
export declare function createSeededRandom(initialSeed?: number): () => number;
export declare function createDefaultContext(overrides?: Partial<EvalContext> & {
    seed?: number;
}): EvalContext;
//# sourceMappingURL=evaluator.d.ts.map