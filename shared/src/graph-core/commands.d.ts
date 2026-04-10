import type { CommandResult, GraphCommand, GraphDocument, UndoableState } from "./types";
export declare function createEmptyDocument(id: string): GraphDocument;
export declare function createUndoableState(document: GraphDocument): UndoableState;
export declare function executeCommand(state: UndoableState, command: GraphCommand): CommandResult;
export declare function undo(state: UndoableState): CommandResult;
export declare function redo(state: UndoableState): CommandResult;
//# sourceMappingURL=commands.d.ts.map