export interface FileTreeNode {
	id: string;
	name: string;
	type: "file" | "folder";
	children?: string[];
	parentId: string | null;
	meta?: {
		size?: number;
		extension?: string;
	};
}

export type FileTreeData = Record<string, FileTreeNode>;

/**
 * Convert flat file list to hierarchical FileTreeData + roots.
 * Mirrors the logic in packages/ui/src/FileTree/types.ts pathsToTree.
 */
export function pathsToTree(files: { filename: string; size: number }[]): {
	tree: FileTreeData;
	roots: string[];
} {
	const tree: FileTreeData = {};
	const folderChildren = new Map<string, Set<string>>();

	for (const file of files) {
		const parts = file.filename.split("/");
		const fileName = parts[parts.length - 1];
		const extension = fileName.includes(".")
			? fileName.split(".").pop()
			: undefined;

		const fileId = file.filename;
		const parentPath = parts.length > 1 ? parts.slice(0, -1).join("/") : null;

		tree[fileId] = {
			id: fileId,
			name: fileName,
			type: "file",
			parentId: parentPath,
			meta: {
				size: file.size,
				extension,
			},
		};

		if (parentPath) {
			if (!folderChildren.has(parentPath)) {
				folderChildren.set(parentPath, new Set());
			}
			folderChildren.get(parentPath)!.add(fileId);
		}

		for (let i = 0; i < parts.length - 1; i++) {
			const folderPath = parts.slice(0, i + 1).join("/");
			const folderName = parts[i];
			const folderParentPath = i > 0 ? parts.slice(0, i).join("/") : null;

			if (!tree[folderPath]) {
				tree[folderPath] = {
					id: folderPath,
					name: folderName,
					type: "folder",
					children: [],
					parentId: folderParentPath,
				};
			}

			if (folderParentPath) {
				if (!folderChildren.has(folderParentPath)) {
					folderChildren.set(folderParentPath, new Set());
				}
				folderChildren.get(folderParentPath)!.add(folderPath);
			}
		}
	}

	for (const [folderId, childIds] of folderChildren.entries()) {
		if (tree[folderId]) {
			tree[folderId].children = Array.from(childIds).sort((a, b) => {
				const aNode = tree[a];
				const bNode = tree[b];
				if (aNode.type !== bNode.type) {
					return aNode.type === "folder" ? -1 : 1;
				}
				return aNode.name.localeCompare(bNode.name);
			});
		}
	}

	const roots: string[] = [];
	for (const node of Object.values(tree)) {
		if (node.parentId === null) {
			roots.push(node.id);
		}
	}
	roots.sort((a, b) => {
		const aNode = tree[a];
		const bNode = tree[b];
		if (aNode.type !== bNode.type) {
			return aNode.type === "folder" ? -1 : 1;
		}
		return aNode.name.localeCompare(bNode.name);
	});

	return { tree, roots };
}
