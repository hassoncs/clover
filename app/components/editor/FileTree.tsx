import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';

interface FileTreeProps {
  files: Array<{ filename: string; size: number }>;
  activeFile: string | null;
  onSelectFile: (filename: string) => void;
  isLoading: boolean;
}

export function FileTree({ files, activeFile, onSelectFile, isLoading }: FileTreeProps) {
  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.md')) return '📄';
    if (filename.endsWith('.json')) return '📋';
    if (filename.endsWith('.gd') || filename.endsWith('.tscn')) return '🎮';
    return '📁';
  };

  if (isLoading && files.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="small" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>EXPLORER</Text>
      </View>
      <ScrollView style={styles.fileList}>
        {files.map((file) => (
          <TouchableOpacity
            key={file.filename}
            style={[
              styles.fileItem,
              activeFile === file.filename && styles.fileItemActive,
            ]}
            onPress={() => onSelectFile(file.filename)}
          >
            <Text style={styles.fileIcon}>{getFileIcon(file.filename)}</Text>
            <Text
              style={[
                styles.fileName,
                activeFile === file.filename && styles.fileNameActive,
              ]}
              numberOfLines={1}
            >
              {file.filename}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 200,
    backgroundColor: '#111827',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  fileList: {
    flex: 1,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    height: 28,
  },
  fileItemActive: {
    backgroundColor: '#374151',
    borderLeftWidth: 2,
    borderLeftColor: '#6366F1',
    paddingLeft: 10,
  },
  fileIcon: {
    fontSize: 14,
    marginRight: 6,
    color: '#9CA3AF',
  },
  fileName: {
    fontSize: 13,
    color: '#D1D5DB',
    flex: 1,
  },
  fileNameActive: {
    color: '#FFFFFF',
  },
});
