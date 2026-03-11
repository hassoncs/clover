import type { PenDocument } from "@slopcade/shared/types/pen";
import { parsePenDocument } from "@slopcade/shared/types/pen";
import { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "./trpc/trpc";

const WORKSPACE_GAME_ID_KEY = "pencil:workspace-game-id";
const WORKSPACE_FILENAME = "pencil-document.pen.json";
const SYNC_DEBOUNCE_MS = 1500;

export type SyncStatus = "idle" | "syncing" | "stale" | "error";

function getConfiguredGameId(): string | null {
	if (typeof window === "undefined") return null;
	try {
		const urlParams = new URLSearchParams(window.location.search);
		const fromUrl = urlParams.get("gameId");
		if (fromUrl) return fromUrl;
		return window.localStorage.getItem(WORKSPACE_GAME_ID_KEY);
	} catch {
		return null;
	}
}

interface UsePencilDocumentSyncOptions {
	document: PenDocument;
	onRemoteDocument: (doc: PenDocument) => void;
}

interface UsePencilDocumentSyncResult {
	gameId: string | null;
	syncStatus: SyncStatus;
	syncError: string | null;
	syncNow: () => void;
}

export function usePencilDocumentSync({
	document,
	onRemoteDocument,
}: UsePencilDocumentSyncOptions): UsePencilDocumentSyncResult {
	const [gameId] = useState<string | null>(getConfiguredGameId);
	const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
	const [syncError, setSyncError] = useState<string | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const loadedAtRef = useRef<number | null>(null);
	const documentRef = useRef(document);
	documentRef.current = document;

	const readQuery = trpc.chatThreads.readWorkspaceFile.useQuery(
		{ gameId: gameId!, filename: WORKSPACE_FILENAME },
		{ enabled: !!gameId, retry: false },
	);

	const writeMutation = trpc.chatThreads.writeWorkspaceFile.useMutation();
	const utils = trpc.useUtils();

	useEffect(() => {
		if (!gameId || readQuery.isLoading) return;

		if (readQuery.data?.content) {
			try {
				const remote = parsePenDocument(JSON.parse(readQuery.data.content));
				const remoteTimestamp = (remote as { _syncedAt?: number })._syncedAt ?? 0;
				const localTimestamp = loadedAtRef.current;
				if (localTimestamp === null) {
					loadedAtRef.current = remoteTimestamp;
					onRemoteDocument(remote);
				} else if (remoteTimestamp > localTimestamp) {
					setSyncStatus("stale");
				}
			} catch (_) {
				setSyncStatus("error");
				setSyncError("Failed to parse remote document");
			}
		} else if (readQuery.isSuccess && !readQuery.data?.content) {
			loadedAtRef.current = Date.now();
		}
	}, [gameId, readQuery.isLoading, readQuery.data, readQuery.isSuccess, onRemoteDocument]);

	const pushToWorkspace = useCallback(async () => {
		if (!gameId) return;
		setSyncStatus("syncing");
		const now = Date.now();
		const docWithTimestamp = {
			...documentRef.current,
			_syncedAt: now,
		};
		try {
			const content = JSON.stringify(docWithTimestamp, null, 2);
			await writeMutation.mutateAsync({ gameId, filename: WORKSPACE_FILENAME, content });
			loadedAtRef.current = now;
			setSyncStatus("idle");
			setSyncError(null);
			utils.chatThreads.readWorkspaceFile.setData(
				{ gameId, filename: WORKSPACE_FILENAME },
				{ exists: true, content },
			);
		} catch (e) {
			setSyncStatus("error");
			setSyncError(e instanceof Error ? e.message : "Sync failed");
		}
	}, [gameId, writeMutation, utils]);

	useEffect(() => {
		if (!gameId) return;
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			void pushToWorkspace();
		}, SYNC_DEBOUNCE_MS);
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [document, gameId, pushToWorkspace]);

	const syncNow = useCallback(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		void pushToWorkspace();
	}, [pushToWorkspace]);

	return { gameId, syncStatus, syncError, syncNow };
}
