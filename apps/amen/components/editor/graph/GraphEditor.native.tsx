import type { GraphDomainAdapter } from "@slopcade/shared/graph-adapters";
import type { GraphCommand, GraphDocument } from "@slopcade/shared/graph-core";
import { useCallback, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

interface GraphEditorProps {
	adapter: GraphDomainAdapter;
	initialDocument?: GraphDocument;
	documentId: string;
	onDocumentChange?: (document: GraphDocument) => void;
	onSelectionChange?: (nodeId: string | null) => void;
}

type BridgeMessageFromNative =
	| { type: "setDocument"; documentId: string; document: GraphDocument }
	| { type: "executeCommand"; command: GraphCommand }
	| {
			type: "setAdapter";
			adapterId: string;
			catalog: ReturnType<GraphDomainAdapter["getNodeCatalog"]>;
	  };

type BridgeMessageFromWebView =
	| { type: "ready" }
	| { type: "documentChanged"; document: GraphDocument }
	| { type: "selectionChanged"; nodeId: string | null }
	| { type: "commandExecuted"; command: GraphCommand; document: GraphDocument };

const GRAPH_HTML = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 100%; height: 100%; overflow: hidden; background: #f3f4f6; }
      #root { width: 100%; height: 100vh; }
    </style>
  </head>
  <body>
    <div id="root">Loading graph editor...</div>
    <script>
      // Bridge stub: the real React Flow app will be injected here
      // when the graph editor bundle is built (like editor-bundle.generated)
      window.dispatchBridgeMessage = function(msg) {
        // Will be replaced by the actual graph editor bundle
        console.log('[GraphEditor] Bridge message received:', msg.type);
      };

      // Signal ready
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
    </script>
  </body>
</html>`;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f3f4f6",
	},
	webView: {
		flex: 1,
		backgroundColor: "#f3f4f6",
	},
});

export function GraphEditor({
	adapter,
	initialDocument,
	documentId,
	onDocumentChange,
	onSelectionChange,
}: GraphEditorProps) {
	const webViewRef = useRef<WebView>(null);
	const isReadyRef = useRef(false);
	const lastDocumentRef = useRef<GraphDocument | undefined>(initialDocument);

	const sendBridgeMessage = useCallback((message: BridgeMessageFromNative) => {
		const script = `window.dispatchBridgeMessage(${JSON.stringify(message)}); true;`;
		webViewRef.current?.injectJavaScript(script);
	}, []);

	const sendInitialState = useCallback(() => {
		sendBridgeMessage({
			type: "setAdapter",
			adapterId: adapter.id,
			catalog: adapter.getNodeCatalog(),
		});

		if (initialDocument) {
			sendBridgeMessage({
				type: "setDocument",
				documentId,
				document: initialDocument,
			});
			lastDocumentRef.current = initialDocument;
		}
	}, [adapter, documentId, initialDocument, sendBridgeMessage]);

	const handleMessage = useCallback(
		(event: WebViewMessageEvent) => {
			try {
				const payload = JSON.parse(
					event.nativeEvent.data,
				) as BridgeMessageFromWebView;

				switch (payload.type) {
					case "ready":
						isReadyRef.current = true;
						sendInitialState();
						break;

					case "documentChanged":
						lastDocumentRef.current = payload.document;
						onDocumentChange?.(payload.document);
						break;

					case "selectionChanged":
						onSelectionChange?.(payload.nodeId);
						break;

					case "commandExecuted":
						lastDocumentRef.current = payload.document;
						onDocumentChange?.(payload.document);
						break;
				}
			} catch {
				return;
			}
		},
		[onDocumentChange, onSelectionChange, sendInitialState],
	);

	useEffect(() => {
		if (!isReadyRef.current) return;
		if (!initialDocument) return;
		if (initialDocument === lastDocumentRef.current) return;

		sendBridgeMessage({
			type: "setDocument",
			documentId,
			document: initialDocument,
		});
		lastDocumentRef.current = initialDocument;
	}, [documentId, initialDocument, sendBridgeMessage]);

	useEffect(() => {
		if (!isReadyRef.current) return;

		sendBridgeMessage({
			type: "setAdapter",
			adapterId: adapter.id,
			catalog: adapter.getNodeCatalog(),
		});
	}, [adapter, sendBridgeMessage]);

	return (
		<View style={styles.container}>
			<WebView
				ref={webViewRef}
				originWhitelist={["*"]}
				javaScriptEnabled={true}
				domStorageEnabled={true}
				source={{ html: GRAPH_HTML }}
				style={styles.webView}
				onMessage={handleMessage}
				scrollEnabled={false}
				onShouldStartLoadWithRequest={(request) =>
					request.url.startsWith("about:")
				}
			/>
		</View>
	);
}
