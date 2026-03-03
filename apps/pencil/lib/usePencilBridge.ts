import type { PenDocument } from "@slopcade/shared/types/pen";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

interface PencilBridge {
	/** Returns the current PenDocument as a JSON string. */
	getDocument: () => string;
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
 * (via Playwright page.evaluate) can read the live pen document.
 *
 * No-op on native.
 */
export function usePencilBridge(
	document: PenDocument,
	_setDocument: (doc: PenDocument) => void,
) {
	const documentRef = useRef(document);
	useEffect(() => {
		documentRef.current = document;
	});

	useEffect(() => {
		if (Platform.OS !== "web" || typeof window === "undefined") return;

		window.__PENCIL_BRIDGE__ = {
			getDocument: () => JSON.stringify(documentRef.current),
			getSelection: () => JSON.stringify({ selectedNodePath: null }),
		};

		return () => {
			delete window.__PENCIL_BRIDGE__;
		};
	}, []);
}
