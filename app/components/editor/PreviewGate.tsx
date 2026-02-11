import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useEditor } from './EditorProvider';

export function PreviewGate({ children }: { children: React.ReactNode }) {
  const { readiness } = useEditor();

  if (!readiness) {
    return <ActivityIndicator />;
  }

  if (readiness.isChecking && !readiness.lastChecked) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.message}>Checking readiness...</Text>
      </View>
    );
  }

  if (!readiness.ready) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Preview Unavailable</Text>
        <Text style={styles.message}>
          {readiness.errors.length} errors found. Fix them to preview.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  title: {
    color: '#EF4444',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  message: {
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 8,
  },
});
