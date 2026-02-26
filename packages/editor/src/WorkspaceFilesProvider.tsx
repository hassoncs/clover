import type { ReactNode } from "react";
import { useWorkspaceFiles, WorkspaceFilesContext } from "./useWorkspaceFiles";

export function WorkspaceFilesProvider({
	gameId,
	children,
}: {
	gameId: string;
	children: ReactNode;
}) {
	const value = useWorkspaceFiles(gameId);
	return (
		<WorkspaceFilesContext.Provider value={value}>
			{children}
		</WorkspaceFilesContext.Provider>
	);
}
