import type { GameDefinition } from "../types/GameDefinition";
import type { ValidationError, ValidationWarning } from "./gameDefinitionTypes";
export declare function validateEntityPrefabRefs(game: Partial<GameDefinition>, errors: ValidationError[]): void;
export declare function validateRuleEntityRefs(_game: Partial<GameDefinition>, _errors: ValidationError[]): void;
export declare function validateParentChildCycles(game: Partial<GameDefinition>, errors: ValidationError[]): void;
export declare function validateConstantRefs(game: Partial<GameDefinition>, constants: Record<string, unknown> | undefined, errors: ValidationError[]): void;
export declare function validateSemantic(game: GameDefinition, errors: ValidationError[], warnings: ValidationWarning[]): void;
//# sourceMappingURL=semantic.d.ts.map