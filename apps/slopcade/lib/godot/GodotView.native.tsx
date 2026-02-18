import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import type { GodotViewProps } from './types';
import './react-native-godot.d';

export function GodotViewNative({ style, onReady, onError }: GodotViewProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [GodotViewComponent, setGodotViewComponent] = useState<React.ComponentType<{ style?: object }> | null>(null);

  useEffect(() => {
    const loadGodot = async () => {
      try {
        const mod = await import('@borndotcom/react-native-godot');
        setGodotViewComponent(() => mod.RTNGodotView);
        setIsLoaded(true);
        onReady?.();
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    };

    loadGodot();
  }, [onReady, onError]);

  if (!isLoaded || !GodotViewComponent) {
    return (
      <View style={[styles.container, styles.loading, style]}>
        <Text style={styles.loadingText}>Loading Godot...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <GodotViewComponent style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  loading: {
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
});
