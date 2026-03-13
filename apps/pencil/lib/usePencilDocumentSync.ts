import type {
	PencilDocumentStore,
	PencilFileRef,
} from "@pencil/core/contracts";
import type { PenDocument } from "@pencil/protocol/pen";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	getConfiguredLegacyWorkspaceId,
	getConfiguredProjectRoot,
	getConfiguredSessionId,
	getConfiguredWorkspaceFilename,
	resolvePencilRuntimeBinding,
} from "./pencilEmbed";
import { usePencilStore } from "./store-context";

const SYNC_DEBOUNCE_MS = 1500;

export type SyncStatus = "idle" | "syncing" | "stale" | "error";

interface UsePencilDocumentSyncOptions {
	document: PenDocument;
	onRemoteDocument: (doc: PenDocument) => void;
	readOnly?: boolean;
	filename?: string;
	store?: PencilDocumentStore;
}

interface UsePencilDocumentSyncResult {
	sessionId: string | null;
	projectRoot: string | null;
	filePath: string | null;
	fileRef: PencilFileRef | null;
	syncStatus: SyncStatus;
	syncError: string | null;
	syncNow: () => void;
}

function buildFileRef({
	sessionId,
	projectRoot,
	filePath,
	legacyWorkspaceId,
}: {
	sessionId: string | null;
	projectRoot: string | null;
	filePath: string;
	legacyWorkspaceId: string | null;
}): PencilFileRef | null {
	const binding = resolvePencilRuntimeBinding({
		sessionId,
		projectRoot,
		filePath,
		legacyWorkspaceId,
	});
	if (!binding.identity) {
		return null;
	}
	return {
		session: {
			id: binding.identity.sessionId,
			project: { root: binding.identity.projectRoot },
		},
		path: binding.identity.filePath,
	};
}

export function usePencilDocumentSync({
	document,
	onRemoteDocument,
	readOnly = false,
	filename,
	store: storeProp,
}: UsePencilDocumentSyncOptions): UsePencilDocumentSyncResult {
	const storeFromContext = usePencilStore();
	const store = storeProp ?? storeFromContext;

	const [sessionId] = useState<string | null>(getConfiguredSessionId);
	const [projectRoot] = useState<string | null>(getConfiguredProjectRoot);
	const [legacyWorkspaceId] = useState<string | null>(
		getConfiguredLegacyWorkspaceId,
	);
	const [configuredFilePath] = useState<string>(
		() => filename?.trim() || getConfiguredWorkspaceFilename(),
	);
	const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
	const [syncError, setSyncError] = useState<string | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const loadedAtRef = useRef<number | null>(null);
	const documentRef = useRef(document);
	documentRef.current = document;

	const queryClient = useQueryClient();
	const fileRef = buildFileRef({
		sessionId,
		projectRoot,
		filePath: configuredFilePath,
		legacyWorkspaceId,
	});
	const queryIdentity =
		fileRef === null
			? "local-storage"
			: `${fileRef.session.id}:${fileRef.session.project.root}:${fileRef.path}`;

	const readQuery = useQuery({
		queryKey: ["pencil", "document", queryIdentity],
		queryFn: async () => {
			if (!store || !fileRef) return null;
			const doc = await store.load(fileRef);
			if (!doc) return null;
			return { document: doc, raw: JSON.stringify(doc) };
		},
		enabled: !!fileRef && !!store,
		retry: false,
	});

	const saveMutation = useMutation({
		mutationFn: async (doc: PenDocument) => {
			if (!store || !fileRef) throw new Error("No store available");
			await store.save(fileRef, doc);
			return doc;
		},
	});

	useEffect(() => {
		if (!fileRef || readQuery.isLoading) return;

		if (readQuery.data?.raw) {
			try {
				const remote = readQuery.data.document;
				const remoteTimestamp =
					(remote as { _syncedAt?: number })._syncedAt ?? 0;
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
		} else if (readQuery.isSuccess && !readQuery.data) {
			loadedAtRef.current = Date.now();
		}
	}, [
		fileRef,
		readQuery.isLoading,
		readQuery.data,
		readQuery.isSuccess,
		onRemoteDocument,
	]);

	const pushToWorkspace = useCallback(async () => {
		if (!fileRef || !store) return;
		setSyncStatus("syncing");
		const now = Date.now();
		const docWithTimestamp = {
			...documentRef.current,
			_syncedAt: now,
		};
		try {
			await saveMutation.mutateAsync(docWithTimestamp);
			loadedAtRef.current = now;
			setSyncStatus("idle");
			setSyncError(null);
			queryClient.setQueryData(
				["pencil", "document", queryIdentity],
				{ document: docWithTimestamp, raw: JSON.stringify(docWithTimestamp) },
			);
		} catch (e) {
			setSyncStatus("error");
			setSyncError(e instanceof Error ? e.message : "Sync failed");
		}
	}, [
		fileRef,
		queryIdentity,
		saveMutation,
		queryClient,
		store,
	]);

	useEffect(() => {
		void document;
		if (readOnly) return;
		if (!fileRef || !store) return;
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			void pushToWorkspace();
		}, SYNC_DEBOUNCE_MS);
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [document, fileRef, pushToWorkspace, readOnly, store]);

	const syncNow = useCallback(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		void pushToWorkspace();
	}, [pushToWorkspace]);

	return {
		sessionId: fileRef?.session.id ?? sessionId,
		projectRoot: fileRef?.session.project.root ?? projectRoot,
		filePath: fileRef?.path ?? null,
		fileRef,
		syncStatus,
		syncError,
		syncNow,
	};
}
