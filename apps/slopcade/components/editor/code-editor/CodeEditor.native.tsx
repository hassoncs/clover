import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import type { CodeEditorProps, EditorLanguage } from './types';
import { EDITOR_BUNDLE } from './native/editor-bundle.generated';

type BridgeMessageFromNative =
  | { type: 'setContent'; value: string }
  | { type: 'setLanguage'; language: EditorLanguage }
  | { type: 'setReadOnly'; readOnly: boolean };

type BridgeMessageFromWebView =
  | { type: 'change'; value: string }
  | { type: 'ready' };

const CM_HTML = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 100%; height: 100%; overflow: hidden; background: #1f2937; }
      #editor { width: 100%; height: 100vh; }
      .cm-editor { height: 100%; font-size: 14px; }
      .cm-scroller { overflow: auto; font-family: Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; }
    </style>
  </head>
  <body>
    <div id="editor"></div>
    <script>${EDITOR_BUNDLE}<\/script>
  </body>
</html>`;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  webView: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
});

export function CodeEditor({ value, onChange, language, readOnly = false, testID }: CodeEditorProps) {
  const webViewRef = useRef<WebView>(null);
  const isReadyRef = useRef(false);
  const lastSentValueRef = useRef(value);

  const sendBridgeMessage = useCallback((message: BridgeMessageFromNative) => {
    const script = `window.dispatchBridgeMessage(${JSON.stringify(message)}); true;`;
    webViewRef.current?.injectJavaScript(script);
  }, []);

  const sendInitialState = useCallback(() => {
    sendBridgeMessage({ type: 'setContent', value });
    sendBridgeMessage({ type: 'setLanguage', language });
    sendBridgeMessage({ type: 'setReadOnly', readOnly });
    lastSentValueRef.current = value;
  }, [language, readOnly, sendBridgeMessage, value]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const payload = JSON.parse(event.nativeEvent.data) as BridgeMessageFromWebView;

        if (payload.type === 'change') {
          lastSentValueRef.current = payload.value;
          onChange(payload.value);
          return;
        }

        if (payload.type === 'ready') {
          isReadyRef.current = true;
          sendInitialState();
        }
      } catch {
        return;
      }
    },
    [onChange, sendInitialState]
  );

  useEffect(() => {
    if (!isReadyRef.current) {
      return;
    }

    if (value === lastSentValueRef.current) {
      return;
    }

    sendBridgeMessage({ type: 'setContent', value });
    lastSentValueRef.current = value;
  }, [sendBridgeMessage, value]);

  useEffect(() => {
    if (!isReadyRef.current) {
      return;
    }

    sendBridgeMessage({ type: 'setLanguage', language });
  }, [language, sendBridgeMessage]);

  useEffect(() => {
    if (!isReadyRef.current) {
      return;
    }

    sendBridgeMessage({ type: 'setReadOnly', readOnly });
  }, [readOnly, sendBridgeMessage]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        testID={testID}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        source={{ html: CM_HTML }}
        style={styles.webView}
        onMessage={handleMessage}
        scrollEnabled={false}
        onShouldStartLoadWithRequest={(request) => request.url.startsWith('about:')}
      />
    </View>
  );
}
