import type { SceneGraph } from "@slopcade/design-canvas/pen/runtime";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { savePenFile } from "./file-io";

interface PencilBridge {
	/** Returns the current SceneGraph serialized as a .pen JSON string. */
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
 * Accepts the mutable SceneGraph directly — mutations are reflected
 * immediately because getDocument() serializes the graph at call time.
 *
 * No-op on native.
 */
export function usePencilBridge(graph: SceneGraph) {
	const graphRef = useRef(graph);
	useEffect(() => {
		graphRef.current = graph;
	});

	useEffect(() => {
		if (Platform.OS !== "web" || typeof window === "undefined") return;

		window.__PENCIL_BRIDGE__ = {
			getDocument: () => savePenFile(graphRef.current),
			getSelection: () => JSON.stringify({ selectedNodeId: null }),
		};

		return () => {
			delete window.__PENCIL_BRIDGE__;
		};
	}, []);
}
