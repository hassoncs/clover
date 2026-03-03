import {
	Awareness,
	applyAwarenessUpdate,
	encodeAwarenessUpdate,
	removeAwarenessStates,
} from "y-protocols/awareness";
import type * as Y from "yjs";

export type CursorPosition = {
	x: number;
	y: number;
};

export type PresenceState = {
	userId: string;
	selectedNodeId: string | null;
	cursorPosition: CursorPosition | null;
};

type AwarenessUpdateListener = (update: {
	added: number[];
	updated: number[];
	removed: number[];
	origin: unknown;
}) => void;

export class CollabAwareness {
	readonly awareness: Awareness;

	constructor(doc: Y.Doc) {
		this.awareness = new Awareness(doc);
	}

	get clientId(): number {
		return this.awareness.clientID;
	}

	setLocalPresence(state: PresenceState): void {
		this.awareness.setLocalState(state);
	}

	clearLocalPresence(): void {
		this.awareness.setLocalState(null);
	}

	getPresenceStates(): Map<number, PresenceState> {
		const result = new Map<number, PresenceState>();
		for (const [clientId, state] of this.awareness.getStates()) {
			if (!isPresenceState(state)) continue;
			result.set(clientId, state);
		}
		return result;
	}

	encodeUpdate(clientIds?: number[]): Uint8Array {
		const ids = clientIds ?? Array.from(this.awareness.getStates().keys());
		return encodeAwarenessUpdate(this.awareness, ids);
	}

	applyUpdate(update: Uint8Array, origin?: unknown): void {
		applyAwarenessUpdate(this.awareness, update, origin);
	}

	removeStates(clientIds: number[], origin: unknown = "disconnect"): void {
		removeAwarenessStates(this.awareness, clientIds, origin);
	}

	onUpdate(listener: AwarenessUpdateListener): () => void {
		const callback = (
			changes: { added: number[]; updated: number[]; removed: number[] },
			origin: unknown,
		): void => {
			listener({ ...changes, origin });
		};

		this.awareness.on("update", callback);
		return () => {
			this.awareness.off("update", callback);
		};
	}

	destroy(): void {
		this.awareness.destroy();
	}
}

function isPresenceState(value: unknown): value is PresenceState {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Record<string, unknown>;
	return (
		typeof candidate.userId === "string" &&
		(candidate.selectedNodeId === null ||
			typeof candidate.selectedNodeId === "string") &&
		isCursorPosition(candidate.cursorPosition)
	);
}

function isCursorPosition(value: unknown): value is CursorPosition | null {
	if (value === null) return true;
	if (!value || typeof value !== "object") return false;
	const candidate = value as Record<string, unknown>;
	return typeof candidate.x === "number" && typeof candidate.y === "number";
}
