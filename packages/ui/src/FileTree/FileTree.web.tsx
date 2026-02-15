import {
	dragAndDropFeature,
	hotkeysCoreFeature,
	type ItemInstance,
	renamingFeature,
	searchFeature,
	selectionFeature,
	syncDataLoaderFeature,
} from "@headless-tree/core";
import { useTree } from "@headless-tree/react";
import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import type { FileTreeNode, FileTreeProps } from "./types";
import {
	FolderIcon,
	FileIcon,
	TSIcon,
	JSIcon,
	JSONIcon,
	MDIcon,
	GodotIcon,
	ImageIcon,
	CSSIcon,
	HTMLIcon,
} from "./FileIcons";

const VIRTUAL_ROOT_ID = "__virtual_root__";

const getFileIcon = (node: FileTreeNode): React.ReactNode => {
	if (node.type === "folder") return <FolderIcon />;
	const ext = node.name.split(".").pop()?.toLowerCase();
	switch (ext) {
		case "ts":
		case "tsx":
			return <TSIcon />;
		case "js":
		case "jsx":
			return <JSIcon />;
		case "json":
			return <JSONIcon />;
		case "md":
			return <MDIcon />;
		case "gd":
		case "tscn":
			return <GodotIcon />;
		case "gdshader":
			return <GodotIcon />;
		case "png":
		case "jpg":
		case "jpeg":
		case "gif":
		case "svg":
			return <ImageIcon />;
		case "css":
		case "scss":
			return <CSSIcon />;
		case "html":
			return <HTMLIcon />;
		default:
			return <FileIcon />;
	}
};

const containerStyle: React.CSSProperties = {
	backgroundColor: "#111827",
	color: "#D1D5DB",
	height: "100%",
	overflowY: "auto",
	fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
	fontSize: "13px",
	lineHeight: "1.4",
};

const baseItemStyle: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	cursor: "pointer",
	padding: "4px 12px",
	minHeight: "28px",
	borderLeft: "2px solid transparent",
	userSelect: "none",
	transition: "background-color 0.1s ease",
};

const chevronBaseStyle: React.CSSProperties = {
	width: "16px",
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	flexShrink: 0,
	fontSize: "10px",
	color: "#6B7280",
	marginRight: "2px",
	background: "none",
	border: "none",
	padding: 0,
};

const iconStyle: React.CSSProperties = {
	marginRight: "8px",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	flexShrink: 0,
};

const nameBaseStyle: React.CSSProperties = {
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
	flex: 1,
};

const renameInputStyle: React.CSSProperties = {
	flex: 1,
	backgroundColor: "#1F2937",
	color: "#FFFFFF",
	border: "1px solid #6366F1",
	borderRadius: "3px",
	padding: "1px 4px",
	outline: "none",
	fontFamily: "inherit",
	fontSize: "inherit",
};

interface TreeItemRowProps {
	item: ItemInstance<FileTreeNode>;
	onSelectFile: (id: string) => void;
}

const TreeItemRow: React.FC<TreeItemRowProps> = ({ item, onSelectFile }) => {
	const renameInputRef = useRef<HTMLInputElement>(null);
	const data = item.getItemData();
	const meta = item.getItemMeta();
	const isSelected = item.isSelected();
	const isFocused = item.isFocused();
	const isFolder = item.isFolder();
	const isExpanded = item.isExpanded();
	const isRenaming = item.isRenaming();

	useEffect(() => {
		if (isRenaming && renameInputRef.current) {
			(renameInputRef.current as unknown as { focus: () => void }).focus();
		}
	}, [isRenaming]);

	const handleClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			if (isFolder) {
				if (isExpanded) {
					item.collapse();
				} else {
					item.expand();
				}
			}
			item.select();
			onSelectFile(item.getId());
		},
		[item, isFolder, isExpanded, onSelectFile],
	);

	const handleDoubleClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			if (item.canRename()) {
				item.startRenaming();
			}
		},
		[item],
	);

	const handleChevronClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			if (isExpanded) {
				item.collapse();
			} else {
				item.expand();
			}
		},
		[item, isExpanded],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter") {
				onSelectFile(item.getId());
			}
			if (e.key === "F2" && item.canRename()) {
				item.startRenaming();
			}
		},
		[item, onSelectFile],
	);

	const itemStyle: React.CSSProperties = {
		...baseItemStyle,
		paddingLeft: `${Math.max(0, meta.level - 1) * 16 + 12}px`,
		...(isSelected
			? { backgroundColor: "#374151", borderLeftColor: "#6366F1" }
			: {}),
		...(!isSelected && isFocused ? { backgroundColor: "#1F2937" } : {}),
	};

	const nameStyle: React.CSSProperties = {
		...nameBaseStyle,
		...(isSelected ? { color: "#FFFFFF", fontWeight: 500 } : {}),
		...(isFolder && !isSelected ? { color: "#E5E7EB", fontWeight: 500 } : {}),
	};

	return (
		<div
			{...item.getProps()}
			role="treeitem"
			tabIndex={0}
			style={itemStyle}
			onClick={handleClick}
			onDoubleClick={handleDoubleClick}
			onKeyDown={handleKeyDown}
			aria-expanded={isFolder ? isExpanded : undefined}
			aria-selected={isSelected}
		>
			<button
				type="button"
				tabIndex={-1}
				style={{
					...chevronBaseStyle,
					visibility: isFolder ? "visible" : "hidden",
					cursor: isFolder ? "pointer" : "default",
				}}
				onClick={isFolder ? handleChevronClick : undefined}
				aria-label={isExpanded ? "Collapse" : "Expand"}
			>
				{isExpanded ? "▾" : "▸"}
			</button>

			<span style={iconStyle}>
				{isFolder ? <FolderIcon expanded={isExpanded} /> : getFileIcon(data)}
			</span>

			{isRenaming ? (
				<input
					ref={renameInputRef}
					{...item.getRenameInputProps()}
					style={renameInputStyle}
				/>
			) : (
				<span style={nameStyle}>{item.getItemName()}</span>
			)}
		</div>
	);
};

export const FileTreeWeb: React.FC<FileTreeProps> = ({
	data,
	roots,
	onSelectFile,
	onRenameFile,
	onMoveFile,
	selectedIds,
	expandedIds,
	onExpandedChange,
	searchQuery,
}) => {
	const tree = useTree<FileTreeNode>({
		rootItemId: VIRTUAL_ROOT_ID,
		features: [
			syncDataLoaderFeature,
			selectionFeature,
			searchFeature,
			renamingFeature,
			dragAndDropFeature,
			hotkeysCoreFeature,
		],
		dragAndDrop: {
			dropTargetOffset: 10,
			onDrop: (items: any[], target: any) => {
				const item = items[0];
				if (!item || !target || !onMoveFile) return;
				onMoveFile(item.getId(), target.getId(), 0);
			},
			canDrop: (items: any[], target: any) => target.isFolder(),
		},
		hotkeys: {
			customRename: ["F2"],
		},
		dataLoader: {
			getItem: (itemId: any) => {
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
						name: "",
						type: "file" as const,
						parentId: null,
					}
				);
			},
			getChildren: (itemId: any) => {
				if (itemId === VIRTUAL_ROOT_ID) {
					return roots;
				}
				return data[itemId]?.children ?? [];
			},
		},
		getItemName: (item: any) => item.getItemData().name,
		isItemFolder: (item: any) => item.getItemData().type === "folder",
		onRename: (item: any, newName: string) => {
			onRenameFile?.(item.getId(), newName);
		},
		isSearchMatchingItem: (query: string, item: any) => {
			return item.getItemName().toLowerCase().includes(query.toLowerCase());
		},
	} as any);

	useEffect(() => {
		if (searchQuery !== undefined && (tree as any).setSearchQuery) {
			(tree as any).setSearchQuery(searchQuery);
		}
	}, [searchQuery, tree]);

	useEffect(() => {
		if (expandedIds && (tree as any).setExpandedItems) {
			(tree as any).setExpandedItems(expandedIds);
		}
	}, [expandedIds, tree]);

	useEffect(() => {
		if (selectedIds && (tree as any).setSelectedItems) {
			(tree as any).setSelectedItems(selectedIds);
		}
	}, [selectedIds, tree]);

	return (
		<div
			{...tree.getContainerProps("File Tree")}
			role="tree"
			style={containerStyle}
		>
			{tree.getItems().map((item) => (
				<TreeItemRow
					key={item.getId()}
					item={item}
					onSelectFile={onSelectFile}
				/>
			))}
		</div>
	);
};
