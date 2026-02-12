import {
	type FileTreeData,
	type FileTreeStateResult,
	pathsToTree,
	useFileTreeState,
} from "@slopcade/ui";
import { useCallback, useMemo } from "react";
import type { useWorkspaceFiles } from "./useWorkspaceFiles";

type WorkspaceFilesResult = ReturnType<typeof useWorkspaceFiles>;

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
	const { files, openFile, isLoadingFiles } = workspaceFiles;

	const treeData = useMemo<FileTreeData>(() => {
		if (!files || files.length === 0) return {};
		return pathsToTree(files);
	}, [files]);

	const roots = useMemo(() => {
		const topLevel: string[] = [];
		for (const [id, node] of Object.entries(treeData)) {
			if (node.parentId === null) {
				topLevel.push(id);
			}
		}
		return topLevel.sort((a, b) => {
			const aNode = treeData[a];
			const bNode = treeData[b];
			if (aNode.type !== bNode.type) {
				return aNode.type === "folder" ? -1 : 1;
			}
			return aNode.name.localeCompare(bNode.name);
		});
	}, [treeData]);

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
