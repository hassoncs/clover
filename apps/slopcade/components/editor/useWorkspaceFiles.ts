import type { AgUiEvent } from "@slopcade/shared/chat";
import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useChatEventSubscription } from "@/lib/chat/ChatStreamProvider";
import { trpcReact } from "@/lib/trpc/react";
import { useDesignDocument } from "./useDesignDocument";

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
	const utils = trpcReact.useUtils();

	const filesQuery = chatThreads.listWorkspaceFiles.useQuery(
		{ gameId: gameId! },
		{ enabled: !!gameId },
	);

	const scaffoldMutation = chatThreads.scaffoldWorkspace.useMutation({
		onSuccess: () => {
			filesQuery.refetch();
		},
	});
	const scaffoldAttemptedRef = useRef(false);
	const scaffoldMutate = scaffoldMutation.mutate;

	useEffect(() => {
		if (
			!gameId ||
			filesQuery.isLoading ||
			scaffoldAttemptedRef.current ||
			scaffoldMutation.isPending
		) {
			return;
		}

		const files = filesQuery.data?.files ?? [];
		if (files.length === 0) {
			scaffoldAttemptedRef.current = true;
			scaffoldMutate({ gameId });
		}
	}, [
		gameId,
		filesQuery.isLoading,
		filesQuery.data,
		scaffoldMutation.isPending,
		scaffoldMutate,
	]);

	const [openTabs, setOpenTabs] = useState<string[]>(["document.md"]);
	const [activeFile, setActiveFile] = useState<string>("document.md");

	const contentQuery = chatThreads.readWorkspaceFile.useQuery(
		{ gameId: gameId!, filename: activeFile },
		{ enabled: !!gameId && !!activeFile },
	);

	useChatEventSubscription((event: AgUiEvent) => {
		if (event.type === "FILE_CHANGED" && event.gameId === gameId) {
			(utils.chatThreads as any).listWorkspaceFiles.invalidate({ gameId });

			if (event.filename === activeFile) {
				(utils.chatThreads as any).readWorkspaceFile.invalidate({
					gameId,
					filename: event.filename,
				});
			} else if (openTabs.includes(event.filename)) {
				(utils.chatThreads as any).readWorkspaceFile.prefetch({
					gameId,
					filename: event.filename,
				});
			}
		}
	});

	const writeMutation = chatThreads.writeWorkspaceFile.useMutation({
		onMutate: async ({
			filename,
			content,
		}: {
			filename: string;
			content: string;
		}) => {
			await (utils.chatThreads as any).readWorkspaceFile.cancel({
				gameId,
				filename,
			});
			(utils.chatThreads as any).readWorkspaceFile.setData(
				{ gameId, filename },
				{ content },
			);
		},
	});

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

	const design = useDesignDocument(gameId);

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
		...design,
	};
}

export type WorkspaceFilesResult = ReturnType<typeof useWorkspaceFiles>;

const WorkspaceFilesContext = createContext<WorkspaceFilesResult | null>(null);

export { WorkspaceFilesContext };

export function useSharedWorkspaceFiles(): WorkspaceFilesResult {
	const ctx = useContext(WorkspaceFilesContext);
	if (!ctx) {
		throw new Error(
			"useSharedWorkspaceFiles must be used within a WorkspaceFilesProvider",
		);
	}
	return ctx;
}
