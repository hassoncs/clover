import {
	createEmptyDesignDocument,
	type DesignDocument,
	migrateDesignDocument,
	parseDesignDocument,
} from "@slopcade/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trpcReact } from "@/lib/trpc/react";

export function useDesignDocument(gameId: string | null) {
	const chatThreads = trpcReact.chatThreads as any;
	const utils = trpcReact.useUtils();

	const [designDocument, setDesignDocument] = useState<DesignDocument | null>(
		null,
	);
	const [isDesignDirty, setIsDesignDirty] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	const designFileQuery = chatThreads.readWorkspaceFile.useQuery(
		{ gameId: gameId!, filename: "design.json" },
		{
			enabled: !!gameId,
			retry: false,
		},
	);

	const writeMutation = chatThreads.writeWorkspaceFile.useMutation();

	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const saveDesignDocument = useCallback(
		async (doc: DesignDocument) => {
			if (!gameId) return;

			setDesignDocument(doc);
			setIsDesignDirty(true);

			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}

			debounceTimerRef.current = setTimeout(async () => {
				try {
					const content = JSON.stringify(doc, null, 2);
					await writeMutation.mutateAsync({
						gameId,
						filename: "design.json",
						content,
					});
					setIsDesignDirty(false);

					// Update cache
					(utils.chatThreads as any).readWorkspaceFile.setData(
						{ gameId, filename: "design.json" },
						{ content },
					);
				} catch (e) {
					console.error("[useDesignDocument] Failed to save design.json", e);
				}
			}, 300);
		},
		[gameId, writeMutation, utils],
	);

	// Load design document
	useEffect(() => {
		if (designFileQuery.isLoading) return;

		if (designFileQuery.data?.content) {
			try {
				const raw = JSON.parse(designFileQuery.data.content);
				const migrated = migrateDesignDocument(raw);
				const doc = parseDesignDocument(migrated);
				setDesignDocument(doc);
				setIsDesignDirty(false);
			} catch (e) {
				console.warn("[useDesignDocument] Failed to parse design.json", e);
				setDesignDocument(null);
			}
			setIsLoading(false);
		} else if (
			designFileQuery.isError ||
			(designFileQuery.isSuccess && !designFileQuery.data?.content)
		) {
			// File missing or error reading it
			if (gameId) {
				const newDoc = createEmptyDesignDocument(gameId, "New Design");
				// Add one empty frame as per requirement
				newDoc.frames = [
					{
						id: `frame-${Date.now()}`,
						title: "Main Frame",
						width: 1920,
						height: 1080,
						position: { x: 0, y: 0 },
						elements: [],
					},
				];
				setDesignDocument(newDoc);
				setIsDesignDirty(true);

				// Auto-save scaffold
				saveDesignDocument(newDoc);
			}
			setIsLoading(false);
		}
	}, [
		designFileQuery.isLoading,
		designFileQuery.data,
		designFileQuery.isError,
		designFileQuery.isSuccess,
		gameId,
		saveDesignDocument,
	]);

	return useMemo(
		() => ({
			designDocument,
			saveDesignDocument,
			isDesignDirty,
			isLoadingDesign: isLoading || designFileQuery.isLoading,
		}),
		[
			designDocument,
			saveDesignDocument,
			isDesignDirty,
			isLoading,
			designFileQuery.isLoading,
		],
	);
}
