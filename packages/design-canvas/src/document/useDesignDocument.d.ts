import { type DesignDocument } from "@slopcade/shared";
export interface UseDesignDocumentIO {
    /** Load the raw JSON string for a document. Return null if not found. */
    loadDocument: () => Promise<string | null>;
    /** Persist the document JSON string. */
    saveDocument: (content: string) => Promise<void>;
}
export interface UseDesignDocumentOptions {
    /** Stable ID for the document (used to seed createEmptyDesignDocument). */
    documentId: string;
    /** Initial title for an auto-created empty document. */
    initialTitle?: string;
    /** IO callbacks for loading and saving. */
    io: UseDesignDocumentIO;
}
export interface UseDesignDocumentResult {
    designDocument: DesignDocument | null;
    saveDesignDocument: (doc: DesignDocument) => void;
    isLoadingDesign: boolean;
    isDesignDirty: boolean;
    loadError: string | null;
    saveError: string | null;
}
/**
 * Generic design document state hook.
 *
 * Decoupled from any specific host (tRPC, AsyncStorage, file system, etc.).
 * The caller provides `io.loadDocument` and `io.saveDocument` callbacks.
 * Debounced saves, stale-version detection, and auto-scaffold on missing doc.
 */
export declare function useDesignDocument({ documentId, initialTitle, io, }: UseDesignDocumentOptions): UseDesignDocumentResult;
//# sourceMappingURL=useDesignDocument.d.ts.map