import {
	createEmptyDesignDocument,
	type DesignDocument,
	DesignSchemaError,
	migrateDesignDocument,
} from "@slopcade/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trpcReact } from "@/lib/trpc/react";

const STALE_DOCUMENT_ERROR =
	"Document was modified by another source. Please refresh and retry.";

export function useDesignDocument(gameId: string | null) {
	const chatThreads = trpcReact.chatThreads as any;
	const utils = trpcReact.useUtils();

	const [designDocument, setDesignDocument] = useState<DesignDocument | null>(
		null,
	);
	const [isDesignDirty, setIsDesignDirty] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [saveError, setSaveError] = useState<string | null>(null);

	const designFileQuery = chatThreads.readWorkspaceFile.useQuery(
		{ gameId: gameId!, filename: "design.json" },
		{
			enabled: !!gameId,
			retry: false,
		},
	);

	const writeMutation = chatThreads.writeWorkspaceFile.useMutation();

	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const loadedUpdatedAtRef = useRef<number | null>(null);

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
					const latest = await designFileQuery.refetch();
					let currentVersion = loadedUpdatedAtRef.current;

					if (latest.data?.content) {
						const remoteDoc = migrateDesignDocument(
							JSON.parse(latest.data.content),
						);
						currentVersion = remoteDoc.metadata.updatedAt;
					}

					const expectedVersion = loadedUpdatedAtRef.current;
					if (
						expectedVersion !== null &&
						currentVersion !== null &&
						expectedVersion !== currentVersion
					) {
						setSaveError(STALE_DOCUMENT_ERROR);
						setIsDesignDirty(true);
						return;
					}

					const baseVersion =
						currentVersion ?? expectedVersion ?? doc.metadata.updatedAt;
					const nextVersion = Math.max(Date.now(), baseVersion + 1);
					const docToSave: DesignDocument = {
						...doc,
						metadata: {
							...doc.metadata,
							updatedAt: nextVersion,
						},
					};

					const content = JSON.stringify(docToSave, null, 2);
					await writeMutation.mutateAsync({
						gameId,
						filename: "design.json",
						content,
					});
					loadedUpdatedAtRef.current = nextVersion;
					setDesignDocument(docToSave);
					setSaveError(null);
					setIsDesignDirty(false);

					// Update cache
					(utils.chatThreads as any).readWorkspaceFile.setData(
						{ gameId, filename: "design.json" },
						{ content },
					);
				} catch (e) {
					const message =
						e instanceof Error ? e.message : "Failed to save design document";
					console.error("[useDesignDocument] Failed to save design.json", e);
					setSaveError(message);
				}
			}, 300);
		},
		[gameId, writeMutation, utils, designFileQuery],
	);

	// Load design document
	useEffect(() => {
		if (designFileQuery.isLoading) return;

		if (designFileQuery.data?.content) {
			try {
				const raw = JSON.parse(designFileQuery.data.content);
				const doc = migrateDesignDocument(raw);
				setDesignDocument(doc);
				loadedUpdatedAtRef.current = doc.metadata.updatedAt;
				setLoadError(null);
				setIsDesignDirty(false);
			} catch (e) {
				const message =
					e instanceof DesignSchemaError
						? e.message
						: "Failed to load design document: unexpected error";
				console.warn("[useDesignDocument] Failed to parse design.json", e);
				setLoadError(message);
				setDesignDocument(null);
				loadedUpdatedAtRef.current = null;
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
				loadedUpdatedAtRef.current = newDoc.metadata.updatedAt;

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

	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, []);

	return useMemo(
		() => ({
			designDocument,
			saveDesignDocument,
			isDesignDirty,
			isLoadingDesign: isLoading || designFileQuery.isLoading,
			loadError,
			saveError,
		}),
		[
			designDocument,
			saveDesignDocument,
			isDesignDirty,
			isLoading,
			designFileQuery.isLoading,
			loadError,
			saveError,
		],
	);
}
