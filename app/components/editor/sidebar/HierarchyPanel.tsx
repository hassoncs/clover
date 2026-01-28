import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { useState } from 'react';
import { useInspector } from '../inspector/InspectorProvider';

export function HierarchyPanel() {
  const { selectedEntityId, selectEntity, inspectMode, toggleInspectMode } = useInspector();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hierarchy</Text>
        <Pressable
          style={[styles.inspectButton, inspectMode && styles.inspectButtonActive]}
          onPress={toggleInspectMode}
        >
          <Text style={styles.inspectButtonText}>
            {inspectMode ? '🔍 On' : '🔍 Off'}
          </Text>
        </Pressable>
      </View>
      
      <TextInput
        style={styles.searchInput}
        placeholder="Search entities..."
        placeholderTextColor="#6B7280"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      
      <View style={styles.content}>
        <Text style={styles.placeholder}>
          Entity tree will appear here
        </Text>
        <Text style={styles.hint}>
          Selected: {selectedEntityId ?? 'None'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  inspectButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#374151',
    borderRadius: 4,
  },
  inspectButtonActive: {
    backgroundColor: '#6366F1',
  },
  inspectButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  searchInput: {
    margin: 12,
    padding: 8,
    backgroundColor: '#374151',
    borderRadius: 6,
    color: '#FFFFFF',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  hint: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 8,
  },
});
