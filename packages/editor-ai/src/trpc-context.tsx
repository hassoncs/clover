import { createContext, type ReactNode, useContext } from "react";

type ListThreadsResult = {
	threads: Array<{ id: string; title: string | null; updatedAt: number }>;
};

type UseThreadsQueryResult = {
	data?: ListThreadsResult;
	isLoading: boolean;
	refetch: () => Promise<unknown>;
};

type CreateThreadMutationResult = {
	mutateAsync: (input: {
		gameId: string;
		title?: string;
	}) => Promise<{ threadId: string }>;
};

export type EditorAiTRPC = {
	chatThreads: {
		listThreads: {
			useQuery: (
				input: { gameId: string; limit: number },
				opts: { enabled: boolean },
			) => UseThreadsQueryResult;
		};
		createThread: {
			useMutation: () => CreateThreadMutationResult;
		};
	};
};

const EditorAiTRPCContext = createContext<EditorAiTRPC | null>(null);

export function EditorAiProvider({
	trpc,
	children,
}: {
	trpc: EditorAiTRPC;
	children: ReactNode;
}) {
	return (
		<EditorAiTRPCContext.Provider value={trpc}>
			{children}
		</EditorAiTRPCContext.Provider>
	);
}

export function useEditorAiTRPC(): EditorAiTRPC {
	const trpc = useContext(EditorAiTRPCContext);
	if (!trpc)
		throw new Error("EditorAiProvider is required above this component");
	return trpc;
}
