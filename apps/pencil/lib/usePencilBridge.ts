import type { PenDocument } from "@slopcade/shared/types/pen";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

interface PencilBridge {
	getDocument: () => string;
	getSelection: () => string;
	newDocument: () => string;
	saveDocument: () => string;
}

declare global {
	interface Window {
		__PENCIL_BRIDGE__?: PencilBridge;
	}
}

const LOCAL_DOC_KEY = "pencil:last-document";

export function usePencilBridge(
	document: PenDocument,
	setDocument: (doc: PenDocument) => void,
) {
	const documentRef = useRef(document);
	const setDocumentRef = useRef(setDocument);

	useEffect(() => {
		documentRef.current = document;
	});

	useEffect(() => {
		setDocumentRef.current = setDocument;
	});

	useEffect(() => {
		if (Platform.OS !== "web" || typeof window === "undefined") return;

		window.__PENCIL_BRIDGE__ = {
			getDocument: () => JSON.stringify(documentRef.current),
			getSelection: () => JSON.stringify({ selectedNodePath: null }),
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
		};

		return () => {
			delete window.__PENCIL_BRIDGE__;
		};
	}, []);
}
