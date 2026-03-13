import type { PenDocument } from "../pen";

export interface PencilProjectRef {
	root: string;
}

export interface PencilSessionRef {
	id: string;
	project: PencilProjectRef;
}

export interface PencilFileRef {
	session: PencilSessionRef;
	path: string;
}

export interface PencilDocumentStore {
	load(fileRef: PencilFileRef): Promise<PenDocument | null>;
	save(fileRef: PencilFileRef, document: PenDocument): Promise<void>;
	list?(session: PencilSessionRef): Promise<PencilFileRef[]>;
}
