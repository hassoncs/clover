import type { GameDefinition, Match3Config, TetrisConfig } from '../types/GameDefinition';
export interface PlayableValidation {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
export declare function validateMatch3Playability(config: Match3Config): PlayableValidation;
export declare function validateTetrisPlayability(config: TetrisConfig): PlayableValidation;
export declare function validatePlayable(gameDef: GameDefinition): PlayableValidation;
//# sourceMappingURL=playable.d.ts.map