export interface FileTreeNode {
	id: string;
	name: string;
	type: "file" | "folder";
	children?: string[];
	parentId: string | null;
	meta?: {
		size?: number;
		extension?: string;
		icon?: string;
	};
}

export interface FileTreeRoot {
	id: string;
	name: string;
	children: string[];
}

export type FileTreeData = Record<string, FileTreeNode>;

export interface FileTreeProps {
	data: FileTreeData;
	roots: string[];
	onSelectFile: (id: string) => void;
	onRenameFile?: (id: string, newName: string) => void;
	onMoveFile?: (id: string, newParentId: string, index: number) => void;
	selectedIds?: string[];
	expandedIds?: string[];
	onExpandedChange?: (ids: string[]) => void;
	searchQuery?: string;
}

export type FileIconMap = Record<string, string>;

/**
 * Convert flat file list to FileTreeData structure.
 * Creates folder nodes for nested paths.
 *
 * @example
 * pathsToTree([
 *   { filename: 'src/utils/a.ts', size: 100 },
 *   { filename: 'src/utils/b.ts', size: 200 },
 *   { filename: 'README.md', size: 50 }
 * ])
 * // Returns FileTreeData with folder nodes for 'src' and 'src/utils'
 */
export function pathsToTree(
	files: { filename: string; size: number }[],
): FileTreeData {
	const data: FileTreeData = {};
	const folderChildren = new Map<string, Set<string>>();

	// First pass: create all file nodes and track folder relationships
	for (const file of files) {
		const parts = file.filename.split("/");
		const fileName = parts[parts.length - 1];
		const extension = fileName.includes(".")
			? fileName.split(".").pop()
			: undefined;

		// Create file node
		const fileId = file.filename;
		const parentPath = parts.length > 1 ? parts.slice(0, -1).join("/") : null;

		data[fileId] = {
			id: fileId,
			name: fileName,
			type: "file",
			parentId: parentPath,
			meta: {
				size: file.size,
				extension,
			},
		};

		// Track parent-child relationships
		if (parentPath) {
			if (!folderChildren.has(parentPath)) {
				folderChildren.set(parentPath, new Set());
			}
			folderChildren.get(parentPath)!.add(fileId);
		}

		// Create intermediate folder nodes
		for (let i = 0; i < parts.length - 1; i++) {
			const folderPath = parts.slice(0, i + 1).join("/");
			const folderName = parts[i];
			const folderParentPath = i > 0 ? parts.slice(0, i).join("/") : null;

			if (!data[folderPath]) {
				data[folderPath] = {
					id: folderPath,
					name: folderName,
					type: "folder",
					children: [],
					parentId: folderParentPath,
				};
			}

			// Track folder parent-child relationships
			if (folderParentPath) {
				if (!folderChildren.has(folderParentPath)) {
					folderChildren.set(folderParentPath, new Set());
				}
				folderChildren.get(folderParentPath)!.add(folderPath);
			}
		}
	}

	// Second pass: populate children arrays for folders
	for (const [folderId, childIds] of folderChildren.entries()) {
		if (data[folderId]) {
			data[folderId].children = Array.from(childIds).sort(
				(a: string, b: string) => {
					// Folders first, then files, alphabetically within each group
					const aNode = data[a];
					const bNode = data[b];
					if (aNode.type !== bNode.type) {
						return aNode.type === "folder" ? -1 : 1;
					}
					return aNode.name.localeCompare(bNode.name);
				},
			);
		}
	}

	return data;
}
