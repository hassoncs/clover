import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import type { GodotViewProps } from './types';

const GODOT_WASM_PATH = process.env.NODE_ENV === 'production'
  ? '/godot/index.html'
  : '/godot/index.html';

export function GodotViewWeb({ style, onReady, onError, onKeyDown, onKeyUp, onMouseMove, onMouseLeave, onClick }: GodotViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isLoadedRef = useRef(false);
  const contentWindowRef = useRef<Window | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let checkInterval: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let iframeKeyDownListener: (() => void) | null = null;
    let iframeKeyUpListener: (() => void) | null = null;
    let iframeMouseMoveListener: (() => void) | null = null;
    let iframeMouseLeaveListener: (() => void) | null = null;
    let iframeClickListener: (() => void) | null = null;

    const attachListeners = (win: Window) => {
      if (!win) return;

      const handleIframeKeyDown = (e: KeyboardEvent) => {
        onKeyDown?.(e);
      };

      const handleIframeKeyUp = (e: KeyboardEvent) => {
        onKeyUp?.(e);
      };

      const handleIframeMouseMove = (e: MouseEvent) => {
        onMouseMove?.(e);
      };

      const handleIframeMouseLeave = (e: MouseEvent) => {
        onMouseLeave?.(e);
      };

      const handleIframeClick = (e: MouseEvent) => {
        onClick?.(e);
      };

      win.addEventListener('keydown', handleIframeKeyDown, { capture: true });
      win.addEventListener('keyup', handleIframeKeyUp, { capture: true });
      win.addEventListener('mousemove', handleIframeMouseMove, { capture: true });
      win.addEventListener('mouseleave', handleIframeMouseLeave, { capture: true });
      win.addEventListener('click', handleIframeClick, { capture: true });

      iframeKeyDownListener = () => win.removeEventListener('keydown', handleIframeKeyDown, { capture: true });
      iframeKeyUpListener = () => win.removeEventListener('keyup', handleIframeKeyUp, { capture: true });
      iframeMouseMoveListener = () => win.removeEventListener('mousemove', handleIframeMouseMove, { capture: true });
      iframeMouseLeaveListener = () => win.removeEventListener('mouseleave', handleIframeMouseLeave, { capture: true });
      iframeClickListener = () => win.removeEventListener('click', handleIframeClick, { capture: true });
    };

    const detachListeners = () => {
      if (iframeKeyDownListener) iframeKeyDownListener();
      if (iframeKeyUpListener) iframeKeyUpListener();
      if (iframeMouseMoveListener) iframeMouseMoveListener();
      if (iframeMouseLeaveListener) iframeMouseLeaveListener();
      if (iframeClickListener) iframeClickListener();
      iframeKeyDownListener = null;
      iframeKeyUpListener = null;
      iframeMouseMoveListener = null;
      iframeMouseLeaveListener = null;
      iframeClickListener = null;
    };

    const handleLoad = () => {
      checkInterval = setInterval(() => {
        try {
          const contentWindow = iframe.contentWindow as Window & { GodotBridge?: unknown };
          if (contentWindow?.GodotBridge) {
            if (checkInterval) clearInterval(checkInterval);
            if (timeoutId) clearTimeout(timeoutId);
            isLoadedRef.current = true;
            contentWindowRef.current = contentWindow;
            attachListeners(contentWindow);
            cleanupRef.current = detachListeners;
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
      if (cleanupRef.current) cleanupRef.current();
      if (contentWindowRef.current) {
        contentWindowRef.current = null;
      }
    };
  }, [onReady, onError, onKeyDown, onKeyUp, onMouseMove, onMouseLeave, onClick]);

  return (
    <View style={[styles.container, style]}>
      <iframe
        ref={iframeRef}
        src={GODOT_WASM_PATH}
        style={iframeStyles}
        title="Godot Game Engine"
        allow="autoplay; fullscreen"
        sandbox="allow-scripts allow-same-origin allow-pointer-lock"
        tabIndex={-1}
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
  touchAction: 'none',  // Prevent browser gestures, allow Godot to handle input
  cursor: 'default',
};
