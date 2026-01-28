import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useInspector } from '../inspector/InspectorProvider';

export function PropertiesPanel() {
  const { selectedEntityId } = useInspector();

  if (!selectedEntityId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Properties</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Select an entity to view properties</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Properties</Text>
        <Text style={styles.entityId}>{selectedEntityId}</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transform</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Position</Text>
            <Text style={styles.value}>0, 0</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Rotation</Text>
            <Text style={styles.value}>0°</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Scale</Text>
            <Text style={styles.value}>1.0, 1.0</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Physics</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Body Type</Text>
            <Text style={styles.value}>dynamic</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Mass</Text>
            <Text style={styles.value}>1.0 kg</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Render</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Visible</Text>
            <Text style={styles.value}>true</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Z-Index</Text>
            <Text style={styles.value}>0</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  header: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  entityId: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  sectionTitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: {
    color: '#D1D5DB',
    fontSize: 13,
  },
  value: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'monospace',
  },
});
