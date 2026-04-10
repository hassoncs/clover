import type { PenDocument } from "@slopcade/shared/types/pen";
import type { PencilFileRef, PencilProjectRef } from "./identity";

export interface PencilDocumentStore {
	load(ref: PencilFileRef): Promise<PenDocument | null>;
	save(ref: PencilFileRef, document: PenDocument): Promise<void>;
	exists(ref: PencilFileRef): Promise<boolean>;
	watch?(
		ref: PencilFileRef,
		callback: (document: PenDocument) => void,
	): () => void;
	listFiles(project: PencilProjectRef): Promise<string[]>;
	delete?(ref: PencilFileRef): Promise<boolean>;
}
