import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import type { GodotViewProps } from './types';

const GODOT_WASM_PATH = process.env.NODE_ENV === 'production' 
  ? '/godot/index.html' 
  : '/godot/index.html';

export function GodotViewWeb({ style, onReady, onError }: GodotViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isLoadedRef = useRef(false);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let checkInterval: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleLoad = () => {
      checkInterval = setInterval(() => {
        try {
          const contentWindow = iframe.contentWindow as Window & { GodotBridge?: unknown };
          if (contentWindow?.GodotBridge) {
            if (checkInterval) clearInterval(checkInterval);
            if (timeoutId) clearTimeout(timeoutId);
            isLoadedRef.current = true;
            onReady?.();
          }
        } catch (err) {
          if (checkInterval) clearInterval(checkInterval);
          if (timeoutId) clearTimeout(timeoutId);
          onError?.(err instanceof Error ? err : new Error('Failed to access Godot iframe'));
        }
      }, 100);

      timeoutId = setTimeout(() => {
        if (checkInterval) clearInterval(checkInterval);
        if (!isLoadedRef.current) {
          onError?.(new Error('Godot WASM load timeout'));
        }
      }, 30000);
    };

    iframe.addEventListener('load', handleLoad);
    return () => {
      iframe.removeEventListener('load', handleLoad);
      if (checkInterval) clearInterval(checkInterval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [onReady, onError]);

  return (
    <View style={[styles.container, style]}>
      <iframe
        ref={iframeRef}
        src={GODOT_WASM_PATH}
        style={iframeStyles}
        title="Godot Game Engine"
        allow="autoplay; fullscreen"
        sandbox="allow-scripts allow-same-origin allow-pointer-lock"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});

const iframeStyles: React.CSSProperties = {
  width: '100%',
  height: '100%',
  border: 'none',
};
