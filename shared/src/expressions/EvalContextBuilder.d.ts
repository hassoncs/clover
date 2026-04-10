import { type EvalContext, type EntityContext } from './types';
import { type GameVariable } from '../types/GameDefinition';
export interface GameVariables {
    [key: string]: GameVariable;
}
export interface GameState {
    score: number;
    lives: number;
    time: number;
    wave: number;
    frameId: number;
    dt: number;
}
export interface EvalContextBuilderOptions {
    gameState: GameState;
    variables?: GameVariables;
    self?: EntityContext;
    seed?: number;
}
export declare class CyclicDependencyError extends Error {
    readonly cycle: string[];
    readonly variableName: string;
    constructor(cycle: string[], variableName: string);
}
export declare class UnknownVariableError extends Error {
    readonly variableName: string;
    readonly referencedIn: string;
    constructor(variableName: string, referencedIn: string);
}
export declare class EvalContextBuilder {
    private nodes;
    private globalNames;
    build(options: EvalContextBuilderOptions): EvalContext;
    private validateDependencies;
    private topologicalSort;
    static create(): EvalContextBuilder;
}
export declare function buildEvalContext(options: EvalContextBuilderOptions): EvalContext;
//# sourceMappingURL=EvalContextBuilder.d.ts.map