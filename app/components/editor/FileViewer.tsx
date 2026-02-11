import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { CodeEditor } from './code-editor';
import { detectLanguage } from './code-editor/types';

interface FileViewerProps {
  filename: string | null;
  content: string | null;
  isLoading: boolean;
  onSave?: (content: string) => void;
  isSaving?: boolean;
}

export function FileViewer({ filename, content, isLoading, onSave, isSaving }: FileViewerProps) {
  const [localContent, setLocalContent] = useState(content ?? '');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [hasRecentEdit, setHasRecentEdit] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editFlagTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (content !== null && content !== localContent && !hasRecentEdit) {
      setLocalContent(content);
    }
  }, [content, hasRecentEdit, localContent]);

  useEffect(() => {
    if (isSaving) {
      setSaveStatus('saving');
    } else if (saveStatus === 'saving') {
      setSaveStatus('saved');
      const timer = setTimeout(() => setSaveStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSaving, saveStatus]);

  const handleTextChange = (text: string) => {
    setLocalContent(text);
    setHasRecentEdit(true);

    if (editFlagTimerRef.current) {
      clearTimeout(editFlagTimerRef.current);
    }
    editFlagTimerRef.current = setTimeout(() => {
      setHasRecentEdit(false);
    }, 2000);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (onSave) {
        onSave(text);
      }
    }, 800);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (editFlagTimerRef.current) {
        clearTimeout(editFlagTimerRef.current);
      }
    };
  }, []);
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
      <CodeEditor
        value={localContent}
        onChange={handleTextChange}
        language={detectLanguage(filename)}
        testID="file-viewer-editor"
      />
      {saveStatus !== 'idle' && (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>
            {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
          </Text>
        </View>
      )}
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

  statusBar: {
    height: 24,
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderTopColor: '#374151',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
