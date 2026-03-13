import type { PenDocument } from "@pencil/protocol/pen";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { LOCAL_DOC_KEY, type PencilRuntimeState } from "./pencilEmbed";

interface PencilBridge {
	getDocument: () => string;
	getSelection: () => string;
	newDocument: () => string;
	saveDocument: () => string;
	getRuntimeState: () => string;
}

declare global {
	interface Window {
		__PENCIL_BRIDGE__?: PencilBridge;
	}
}

interface UsePencilBridgeOptions {
	selectedNodePath?: string[] | null;
	runtimeState?: PencilRuntimeState | null;
}

export function usePencilBridge(
	document: PenDocument,
	setDocument: (doc: PenDocument) => void,
	options: UsePencilBridgeOptions = {},
) {
	const documentRef = useRef(document);
	const setDocumentRef = useRef(setDocument);
	const selectedNodePathRef = useRef<string[] | null>(
		options.selectedNodePath ?? null,
	);
	const runtimeStateRef = useRef<PencilRuntimeState | null>(
		options.runtimeState ?? null,
	);

	useEffect(() => {
		documentRef.current = document;
	});

	useEffect(() => {
		setDocumentRef.current = setDocument;
	});

	useEffect(() => {
		selectedNodePathRef.current = options.selectedNodePath ?? null;
	}, [options.selectedNodePath]);

	useEffect(() => {
		runtimeStateRef.current = options.runtimeState ?? null;
	}, [options.runtimeState]);

	useEffect(() => {
		if (Platform.OS !== "web" || typeof window === "undefined") return;

		window.__PENCIL_BRIDGE__ = {
			getDocument: () => JSON.stringify(documentRef.current),
			getSelection: () =>
				JSON.stringify({ selectedNodePath: selectedNodePathRef.current }),
			newDocument: () => {
				const empty: PenDocument = { version: 1, children: [] };
				setDocumentRef.current(empty);
				if (typeof window !== "undefined") {
					window.localStorage.setItem(LOCAL_DOC_KEY, JSON.stringify(empty));
				}
				return JSON.stringify({ ok: true });
			},
			saveDocument: () => {
				const doc = documentRef.current;
				if (typeof window !== "undefined") {
					window.localStorage.setItem(LOCAL_DOC_KEY, JSON.stringify(doc));
				}
				return JSON.stringify({ ok: true, document: doc });
			},
			getRuntimeState: () =>
				JSON.stringify(runtimeStateRef.current ?? { mode: "editor" }),
		};

		return () => {
			delete window.__PENCIL_BRIDGE__;
		};
	}, []);
}
