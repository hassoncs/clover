import {
	type FileTreeData,
	type FileTreeStateResult,
	useFileTreeState,
} from "@slopcade/ui";
import { useCallback } from "react";
import type { WorkspaceFilesResult } from "./useWorkspaceFiles";

export interface EditorFileTreeResult {
	treeState: FileTreeStateResult;
	treeData: FileTreeData;
	roots: string[];
	isLoading: boolean;
	onSelectFile: (id: string) => void;
	onRenameFile: (id: string, newName: string) => void;
	onMoveFile: (id: string, newParentId: string, index: number) => void;
}

export function useEditorFileTree(
	workspaceFiles: WorkspaceFilesResult,
): EditorFileTreeResult {
	const { tree: treeData, roots, openFile, isLoadingFiles } = workspaceFiles;

	const handleSelectFile = useCallback(
		(id: string) => {
			openFile(id);
		},
		[openFile],
	);

	const handleRenameFile = useCallback((id: string, newName: string) => {
		console.warn(
			`[useEditorFileTree] Rename not yet implemented: ${id} → ${newName}`,
		);
	}, []);

	const handleMoveFile = useCallback(
		(id: string, newParentId: string, index: number) => {
			console.warn(
				`[useEditorFileTree] Move not yet implemented: ${id} → ${newParentId} at ${index}`,
			);
		},
		[],
	);

	const treeState = useFileTreeState({
		data: treeData,
		roots,
		onSelectFile: handleSelectFile,
		onRenameFile: handleRenameFile,
		onMoveFile: handleMoveFile,
	});

	return {
		treeState,
		treeData,
		roots,
		isLoading: isLoadingFiles,
		onSelectFile: handleSelectFile,
		onRenameFile: handleRenameFile,
		onMoveFile: handleMoveFile,
	};
}
