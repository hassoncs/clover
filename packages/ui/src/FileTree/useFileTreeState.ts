import {
	createTree,
	type ItemInstance,
	renamingFeature,
	searchFeature,
	selectionFeature,
	syncDataLoaderFeature,
	type TreeInstance,
	type TreeState,
} from "@headless-tree/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FileTreeData, FileTreeNode } from "./types";

const VIRTUAL_ROOT_ID = "__virtual_root__";

export interface FileTreeStateConfig {
	data: FileTreeData;
	roots: string[];
	onSelectFile?: (id: string) => void;
	onRenameFile?: (id: string, newName: string) => void;
	onMoveFile?: (id: string, newParentId: string, index: number) => void;
	initialExpandedIds?: string[];
	onExpandedChange?: (ids: string[]) => void;
}

export interface VisibleNode {
	id: string;
	depth: number;
	item: ItemInstance<FileTreeNode>;
}

export interface FileTreeStateResult {
	treeInstance: TreeInstance<FileTreeNode>;
	visibleNodes: VisibleNode[];
	expandedIds: string[];
	selectedIds: string[];
	focusedId: string | null;
	searchQuery: string | null;
	renamingId: string | null;
	setExpandedIds: (ids: string[]) => void;
	setSelectedIds: (ids: string[]) => void;
	setSearchQuery: (query: string | null) => void;
	toggleExpanded: (id: string) => void;
	selectItem: (id: string) => void;
	expandAll: () => void;
	collapseAll: () => void;
}

export function useFileTreeState(
	config: FileTreeStateConfig,
): FileTreeStateResult {
	const { data, roots, onSelectFile, onRenameFile, initialExpandedIds } =
		config;

	const [state, setState] = useState<Partial<TreeState<FileTreeNode>>>(() => ({
		expandedItems: initialExpandedIds ?? [],
		selectedItems: [],
		focusedItem: null,
		search: null,
	}));

	const configRef = useRef(config);
	configRef.current = config;

	const tree = useMemo(() => {
		return createTree<FileTreeNode>({
			features: [
				syncDataLoaderFeature,
				selectionFeature,
				searchFeature,
				renamingFeature,
			],
			rootItemId: VIRTUAL_ROOT_ID,
			dataLoader: {
				getItem: () =>
					({ id: "", name: "", type: "file", parentId: null }) as FileTreeNode,
				getChildren: () => [],
			},
			getItemName: (item) => item.getItemData().name,
			isItemFolder: (item) => item.getItemData().type === "folder",
			setState: (updater) => {
				setState((prev) => {
					const next = typeof updater === "function" ? updater(prev) : updater;
					return { ...prev, ...next };
				});
			},
		});
	}, []);

	useEffect(() => {
		tree.setConfig({
			features: [
				syncDataLoaderFeature,
				selectionFeature,
				searchFeature,
				renamingFeature,
			],
			state,
			setState: (updater) => {
				setState((prev) => {
					const next = typeof updater === "function" ? updater(prev) : updater;
					return { ...prev, ...next };
				});
			},
			rootItemId: VIRTUAL_ROOT_ID,
			dataLoader: {
				getItem: (itemId) => {
					if (itemId === VIRTUAL_ROOT_ID) {
						return {
							id: VIRTUAL_ROOT_ID,
							name: "Root",
							type: "folder",
							children: roots,
							parentId: null,
						};
					}
					return (
						data[itemId] ?? {
							id: itemId,
							name: itemId,
							type: "file" as const,
							parentId: null,
						}
					);
				},
				getChildren: (itemId) => {
					if (itemId === VIRTUAL_ROOT_ID) {
						return roots;
					}
					return data[itemId]?.children ?? [];
				},
			},
			getItemName: (item) => item.getItemData().name,
			isItemFolder: (item) => item.getItemData().type === "folder",
			onRename: (item, newName) => {
				configRef.current.onRenameFile?.(item.getId(), newName);
			},
			isSearchMatchingItem: (query, item) => {
				return item.getItemName().toLowerCase().includes(query.toLowerCase());
			},
		});
	}, [tree, data, roots, state]);

	const expandedIds = useMemo(
		() => state.expandedItems ?? [],
		[state.expandedItems],
	);

	const selectedIds = useMemo(
		() => state.selectedItems ?? [],
		[state.selectedItems],
	);

	const focusedId = state.focusedItem ?? null;

	const renamingId = useMemo(() => {
		if (!state.renamingItem) return null;
		return state.renamingItem;
	}, [state.renamingItem]);

	const searchQuery = state.search ?? null;

	useEffect(() => {
		if (onSelectFile && state.selectedItems && state.selectedItems.length > 0) {
			const selected = state.selectedItems[state.selectedItems.length - 1];
			const node = data[selected];
			if (node && node.type === "file") {
				onSelectFile(selected);
			}
		}
	}, [state.selectedItems, onSelectFile, data]);

	useEffect(() => {
		configRef.current.onExpandedChange?.(expandedIds);
	}, [expandedIds]);

	const visibleNodes = useMemo(() => {
		void data;
		void roots;
		void state.expandedItems;
		void state.search;

		const nodes: VisibleNode[] = [];

		const traverse = (itemId: string, depth: number) => {
			if (itemId !== VIRTUAL_ROOT_ID) {
				const item = tree.getItemInstance(itemId);
				if (!item) return;
				nodes.push({ id: itemId, depth, item });
				if (!item.isExpanded()) return;
			}

			const item = tree.getItemInstance(itemId);
			if (item) {
				const children = item.getChildren();
				for (const child of children) {
					traverse(child.getId(), depth + 1);
				}
			}
		};

		traverse(VIRTUAL_ROOT_ID, 0);
		return nodes;
	}, [state.expandedItems, state.search, tree, roots, data]);

	const setExpandedIds = useCallback((ids: string[]) => {
		setState((prev) => ({ ...prev, expandedItems: ids }));
	}, []);

	const setSelectedIds = useCallback((ids: string[]) => {
		setState((prev) => ({ ...prev, selectedItems: ids }));
	}, []);

	const setSearchQuery = useCallback((query: string | null) => {
		setState((prev) => ({ ...prev, search: query }));
	}, []);

	const toggleExpanded = useCallback(
		(id: string) => {
			const item = tree.getItemInstance(id);
			if (!item) return;
			if (item.isExpanded()) {
				item.collapse();
			} else {
				item.expand();
			}
		},
		[tree],
	);

	const selectItem = useCallback(
		(id: string) => {
			const item = tree.getItemInstance(id);
			if (!item) return;
			item.select();
		},
		[tree],
	);

	const expandAll = useCallback(() => {
		const allFolderIds: string[] = [];
		for (const [id, node] of Object.entries(data)) {
			if (node.type === "folder") {
				allFolderIds.push(id);
			}
		}
		setState((prev) => ({ ...prev, expandedItems: allFolderIds }));
	}, [data]);

	const collapseAll = useCallback(() => {
		setState((prev) => ({ ...prev, expandedItems: [] }));
	}, []);

	return {
		treeInstance: tree,
		visibleNodes,
		expandedIds,
		selectedIds,
		focusedId,
		searchQuery,
		renamingId,
		setExpandedIds,
		setSelectedIds,
		setSearchQuery,
		toggleExpanded,
		selectItem,
		expandAll,
		collapseAll,
	};
}
