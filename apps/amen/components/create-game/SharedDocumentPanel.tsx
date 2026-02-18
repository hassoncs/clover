import { View, Text, ScrollView, StyleSheet } from 'react-native';

interface SharedDocumentPanelProps {
  content: string | null;
}

export function SharedDocumentPanel({ content }: SharedDocumentPanelProps) {
  if (!content) {
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
      <View style={styles.header}>
        <Text style={styles.headerText}>document.md</Text>
      </View>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.documentText}>{content}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)',
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D1D5DB',
    fontFamily: 'monospace',
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
