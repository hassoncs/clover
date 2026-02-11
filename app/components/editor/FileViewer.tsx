import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';

interface FileViewerProps {
  filename: string | null;
  content: string | null;
  isLoading: boolean;
}

export function FileViewer({ filename, content, isLoading }: FileViewerProps) {
  if (!filename) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📄</Text>
          <Text style={styles.emptyTitle}>No File Selected</Text>
          <Text style={styles.emptySubtitle}>
            Select a file from the sidebar to view its content.
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading && content === null) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (content === null) {
     if (filename === 'document.md') {
        return (
            <View style={styles.container}>
                <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📄</Text>
                <Text style={styles.emptyTitle}>Shared Document</Text>
                <Text style={styles.emptySubtitle}>
                    The AI will create and edit a document here as you chat.
                </Text>
                </View>
            </View>
        );
     }
     
     return (
        <View style={styles.container}>
            <View style={styles.emptyState}>
                <Text style={styles.emptySubtitle}>File is empty or could not be read.</Text>
            </View>
        </View>
     );
  }

  return (
    <View style={styles.container} testID="file-viewer">
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text testID="file-viewer-content" style={styles.documentText}>{content}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  documentText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#E5E7EB',
    fontFamily: 'monospace',
  },
});
