import type { PencilDocumentStore } from "./document-store";

export interface PencilHostAdapter {
	getDocumentStore(): PencilDocumentStore | null;
}
