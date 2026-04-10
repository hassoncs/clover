import { createEmptyDesignDocument, DesignSchemaError, migrateDesignDocument, } from "@slopcade/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
const STALE_DOCUMENT_ERROR = "Document was modified by another source. Please refresh and retry.";
/**
 * Generic design document state hook.
 *
 * Decoupled from any specific host (tRPC, AsyncStorage, file system, etc.).
 * The caller provides `io.loadDocument` and `io.saveDocument` callbacks.
 * Debounced saves, stale-version detection, and auto-scaffold on missing doc.
 */
export function useDesignDocument({ documentId, initialTitle = "New Design", io, }) {
    const [designDocument, setDesignDocument] = useState(null);
    const [isDesignDirty, setIsDesignDirty] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [saveError, setSaveError] = useState(null);
    const loadedUpdatedAtRef = useRef(null);
    const debounceTimerRef = useRef(null);
    // Stable ref to io so callbacks don't re-create on every render
    const ioRef = useRef(io);
    useEffect(() => {
        ioRef.current = io;
    }, [io]);
    const saveDesignDocument = useCallback((doc) => {
        setDesignDocument(doc);
        setIsDesignDirty(true);
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(async () => {
            try {
                // Re-load to detect concurrent edits
                const rawLatest = await ioRef.current.loadDocument();
                let currentVersion = loadedUpdatedAtRef.current;
                if (rawLatest) {
                    const remoteDoc = migrateDesignDocument(JSON.parse(rawLatest));
                    currentVersion = remoteDoc.metadata.updatedAt;
                }
                const expectedVersion = loadedUpdatedAtRef.current;
                if (expectedVersion !== null &&
                    currentVersion !== null &&
                    expectedVersion !== currentVersion) {
                    setSaveError(STALE_DOCUMENT_ERROR);
                    setIsDesignDirty(true);
                    return;
                }
                const baseVersion = currentVersion ?? expectedVersion ?? doc.metadata.updatedAt;
                const nextVersion = Math.max(Date.now(), baseVersion + 1);
                const docToSave = {
                    ...doc,
                    metadata: { ...doc.metadata, updatedAt: nextVersion },
                };
                await ioRef.current.saveDocument(JSON.stringify(docToSave, null, 2));
                loadedUpdatedAtRef.current = nextVersion;
                setDesignDocument(docToSave);
                setSaveError(null);
                setIsDesignDirty(false);
            }
            catch (e) {
                const message = e instanceof Error ? e.message : "Failed to save design document";
                console.error("[useDesignDocument] save failed", e);
                setSaveError(message);
            }
        }, 300);
    }, []);
    // Initial load
    useEffect(() => {
        let cancelled = false;
        async function load() {
            setIsLoading(true);
            try {
                const raw = await ioRef.current.loadDocument();
                if (cancelled)
                    return;
                if (raw) {
                    const doc = migrateDesignDocument(JSON.parse(raw));
                    setDesignDocument(doc);
                    loadedUpdatedAtRef.current = doc.metadata.updatedAt;
                    setLoadError(null);
                    setIsDesignDirty(false);
                }
                else {
                    // Auto-scaffold an empty document
                    const newDoc = createEmptyDesignDocument(documentId, initialTitle);
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
                    saveDesignDocument(newDoc);
                }
            }
            catch (e) {
                if (cancelled)
                    return;
                const message = e instanceof DesignSchemaError
                    ? e.message
                    : "Failed to load design document: unexpected error";
                console.warn("[useDesignDocument] load failed", e);
                setLoadError(message);
                setDesignDocument(null);
                loadedUpdatedAtRef.current = null;
            }
            finally {
                if (!cancelled)
                    setIsLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [documentId]);
    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current)
                clearTimeout(debounceTimerRef.current);
        };
    }, []);
    return useMemo(() => ({
        designDocument,
        saveDesignDocument,
        isDesignDirty,
        isLoadingDesign: isLoading,
        loadError,
        saveError,
    }), [
        designDocument,
        saveDesignDocument,
        isDesignDirty,
        isLoading,
        loadError,
        saveError,
    ]);
}
//# sourceMappingURL=useDesignDocument.js.map