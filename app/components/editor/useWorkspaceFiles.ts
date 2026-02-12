import { useState } from "react";
import { trpcReact } from "@/lib/trpc/react";

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

export function useWorkspaceFiles(gameId: string | null) {
	const chatThreads = trpcReact.chatThreads as any;

	const filesQuery = chatThreads.listWorkspaceFiles.useQuery(
		{ gameId: gameId! },
		{ enabled: !!gameId, refetchInterval: 5000 },
	);

	const [openTabs, setOpenTabs] = useState<string[]>(["document.md"]);
	const [activeFile, setActiveFile] = useState<string>("document.md");

	const contentQuery = chatThreads.readWorkspaceFile.useQuery(
		{ gameId: gameId!, filename: activeFile },
		{ enabled: !!gameId && !!activeFile, refetchInterval: 3000 },
	);

	const writeMutation = chatThreads.writeWorkspaceFile.useMutation();

	const saveFile = (filename: string, content: string) => {
		if (!gameId) return;
		writeMutation.mutate({ gameId, filename, content });
	};

	const openFile = (filename: string) => {
		if (!openTabs.includes(filename)) {
			setOpenTabs((prev) => [...prev, filename]);
		}
		setActiveFile(filename);
	};

	const closeTab = (filename: string) => {
		setOpenTabs((prev) => {
			const next = prev.filter((f) => f !== filename);
			if (activeFile === filename) {
				const newActive =
					next.length > 0 ? next[next.length - 1] : "document.md";
				setActiveFile(newActive);

				if (next.length === 0) {
					return ["document.md"];
				}
			}
			return next;
		});
	};

	return {
		files: filesQuery.data?.files ?? [],
		tree: filesQuery.data?.tree ?? {},
		roots: filesQuery.data?.roots ?? [],
		isLoadingFiles: filesQuery.isLoading,
		openTabs,
		activeFile,
		activeFileContent: contentQuery.data?.content ?? null,
		isLoadingContent: contentQuery.isLoading,
		openFile,
		closeTab,
		setActiveFile,
		saveFile,
		isSaving: writeMutation.isPending,
	};
}
