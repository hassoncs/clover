import type { GameDefinition } from "../types/GameDefinition";
import type { GameDefinitionValidationResult } from "./gameDefinitionTypes";
export type { GameDefinitionValidationResult, ValidationError, ValidationWarning, } from "./gameDefinitionTypes";
export declare function validateGameDefinition(game: GameDefinition): GameDefinitionValidationResult;
export declare function getValidationSummary(result: GameDefinitionValidationResult): string;
//# sourceMappingURL=gameDefinitionValidator.d.ts.map