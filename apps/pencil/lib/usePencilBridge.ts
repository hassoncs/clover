import {
	applyCanvasOps,
	type CanvasOp,
	type DesignCanvasHost,
} from "@slopcade/design-canvas";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

interface PencilBridge {
	/** Returns the current DesignDocument as a JSON string. */
	getDocument: () => string;
	/**
	 * Apply canvas operations to the live document.
	 * ops: JSON-serialized CanvasOp[]
	 * Returns { ok: true, opCount } or { ok: false, error }
	 */
	applyOps: (opsJson: string) => {
		ok: boolean;
		opCount?: number;
		error?: string;
	};
	/** Returns current selection state as a JSON string. */
	getSelection: () => string;
}

declare global {
	interface Window {
		__PENCIL_BRIDGE__?: PencilBridge;
	}
}

/**
 * Registers window.__PENCIL_BRIDGE__ on web so the game-inspector MCP
 * (via Playwright page.evaluate) can read/write the live design document.
 *
 * No-op on native.
 */
export function usePencilBridge(host: DesignCanvasHost) {
	// Always-current ref avoids stale closure in the registered bridge
	const hostRef = useRef(host);
	useEffect(() => {
		hostRef.current = host;
	});

	useEffect(() => {
		if (Platform.OS !== "web" || typeof window === "undefined") return;

		window.__PENCIL_BRIDGE__ = {
			getDocument: () => {
				const doc = hostRef.current.document;
				return doc ? JSON.stringify(doc) : "null";
			},

			applyOps: (opsJson: string) => {
				try {
					const ops = JSON.parse(opsJson) as CanvasOp[];
					const current = hostRef.current.document;
					if (!current) {
						return { ok: false, error: "No document loaded" };
					}
					const next = applyCanvasOps(current, ops);
					hostRef.current.saveDocument(next);
					return { ok: true, opCount: ops.length };
				} catch (e) {
					return { ok: false, error: String(e) };
				}
			},

			getSelection: () =>
				JSON.stringify({
					selectedFrameId: hostRef.current.selectedFrameId,
					selectedElementId: hostRef.current.selectedElementId,
				}),
		};

		return () => {
			delete window.__PENCIL_BRIDGE__;
		};
	}, []); // empty deps: hostRef always has the latest values
}
