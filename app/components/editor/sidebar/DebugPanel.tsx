import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { useState } from 'react';
import { useInspector } from '../inspector/InspectorProvider';

export function DebugPanel() {
  const { inspectMode, toggleInspectMode } = useInspector();
  const [showPhysics, setShowPhysics] = useState(false);
  const [showSprites, setShowSprites] = useState(false);
  const [showIds, setShowIds] = useState(false);
  const [pauseOnStart, setPauseOnStart] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Debug</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visualization</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>Show Physics Shapes</Text>
            <Switch
              value={showPhysics}
              onValueChange={setShowPhysics}
              trackColor={{ false: '#374151', true: '#6366F1' }}
            />
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Show Sprite Bounds</Text>
            <Switch
              value={showSprites}
              onValueChange={setShowSprites}
              trackColor={{ false: '#374151', true: '#6366F1' }}
            />
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Show Entity IDs</Text>
            <Switch
              value={showIds}
              onValueChange={setShowIds}
              trackColor={{ false: '#374151', true: '#6366F1' }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inspector</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>Inspect Mode</Text>
            <Switch
              value={inspectMode}
              onValueChange={toggleInspectMode}
              trackColor={{ false: '#374151', true: '#6366F1' }}
            />
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Pause on Start</Text>
            <Switch
              value={pauseOnStart}
              onValueChange={setPauseOnStart}
              trackColor={{ false: '#374151', true: '#6366F1' }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tools</Text>
          <Text style={styles.hint}>
            Right-click viewport to inspect entities at cursor
          </Text>
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
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    color: '#D1D5DB',
    fontSize: 14,
  },
  hint: {
    color: '#6B7280',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
