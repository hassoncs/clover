export interface PencilProjectRef {
	readonly root: string;
}

export interface PencilSessionId {
	readonly id: string;
	readonly project: PencilProjectRef;
}

export interface PencilFileRef {
	readonly session: PencilSessionId;
	readonly path: string;
}

export interface PencilRenderTarget {
	readonly file: PencilFileRef;
	readonly nodeId?: string;
	readonly nodePath?: readonly string[];
}
