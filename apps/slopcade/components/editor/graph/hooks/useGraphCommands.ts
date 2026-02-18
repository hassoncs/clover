import {
	type CommandResult,
	createEmptyDocument,
	createUndoableState,
	executeCommand,
	type GraphCommand,
	type GraphDocument,
	redo as redoCommand,
	type UndoableState,
	undo as undoCommand,
} from "@slopcade/shared/graph-core";
import { useCallback, useState } from "react";

export interface UseGraphCommandsResult {
	state: UndoableState;
	execute: (command: GraphCommand) => CommandResult;
	undo: () => CommandResult;
	redo: () => CommandResult;
	canUndo: boolean;
	canRedo: boolean;
	reset: (document?: GraphDocument) => void;
}

export function useGraphCommands(initialId: string): UseGraphCommandsResult {
	const [state, setState] = useState<UndoableState>(() =>
		createUndoableState(createEmptyDocument(initialId)),
	);

	const execute = useCallback(
		(command: GraphCommand) => {
			const result = executeCommand(state, command);
			if (!result.error) {
				setState(result.state);
			}
			return result;
		},
		[state],
	);

	const undo = useCallback(() => {
		const result = undoCommand(state);
		if (!result.error) {
			setState(result.state);
		}
		return result;
	}, [state]);

	const redo = useCallback(() => {
		const result = redoCommand(state);
		if (!result.error) {
			setState(result.state);
		}
		return result;
	}, [state]);

	const reset = useCallback(
		(document?: GraphDocument) => {
			setState(createUndoableState(document || createEmptyDocument(initialId)));
		},
		[initialId],
	);

	return {
		state,
		execute,
		undo,
		redo,
		canUndo: state.past.length > 0,
		canRedo: state.future.length > 0,
		reset,
	};
}
