import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useEditor } from './EditorProvider';
import { Ionicons } from '@expo/vector-icons';

export function DiagnosticsPanel() {
  const { readiness } = useEditor();
  const [expanded, setExpanded] = React.useState(true);

  if (!readiness || (readiness.errors.length === 0 && readiness.warnings.length === 0)) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name={expanded ? "chevron-down" : "chevron-forward"} size={16} color="#9CA3AF" />
          <Text style={styles.title}>Diagnostics</Text>
        </View>
        <View style={styles.badges}>
          {readiness.errors.length > 0 && (
            <View style={[styles.badge, styles.errorBadge]}>
              <Text style={styles.errorText}>{readiness.errors.length} Errors</Text>
            </View>
          )}
          {readiness.warnings.length > 0 && (
            <View style={[styles.badge, styles.warningBadge]}>
              <Text style={styles.warningText}>{readiness.warnings.length} Warnings</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {expanded && (
        <ScrollView style={styles.content} nestedScrollEnabled>
          {readiness.errors.map((error, i) => (
            <View key={`err-${i}-${error.code || 'unknown'}`} style={styles.item}>
              <Ionicons name="close-circle" size={14} color="#EF4444" style={styles.icon} />
              <View style={styles.itemContent}>
                <Text style={styles.message}>{error.message}</Text>
                {error.path && <Text style={styles.path}>{error.path}</Text>}
              </View>
            </View>
          ))}
          {readiness.warnings.map((warning, i) => (
            <View key={`warn-${i}-${warning.code || 'unknown'}`} style={styles.item}>
              <Ionicons name="warning" size={14} color="#F59E0B" style={styles.icon} />
              <View style={styles.itemContent}>
                <Text style={styles.message}>{warning.message}</Text>
                {warning.path && <Text style={styles.path}>{warning.path}</Text>}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1F2937',
    borderTopWidth: 1,
    borderTopColor: '#374151',
    maxHeight: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: '#111827',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  errorBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  warningBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '600',
  },
  warningText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    padding: 8,
  },
  item: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  icon: {
    marginTop: 2,
  },
  itemContent: {
    flex: 1,
  },
  message: {
    color: '#D1D5DB',
    fontSize: 12,
  },
  path: {
    color: '#6B7280',
    fontSize: 10,
    marginTop: 2,
    fontFamily: 'monospace',
  },
});
