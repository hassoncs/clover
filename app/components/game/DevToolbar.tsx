import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useDevToolsOptional } from '@/lib/contexts/DevToolsContext';

export function DevToolbar() {
  const devTools = useDevToolsOptional();
  
  if (!devTools) {
    return null;
  }
  
  const { state, isLoading, toggleInputDebug, togglePhysicsShapes, toggleFPS, toggleExpanded } = devTools;

  if (isLoading) return null;

  return (
    <View style={[styles.container, state.isExpanded && styles.containerExpanded]} pointerEvents="box-none">
      <Pressable
        style={styles.header}
        onPress={toggleExpanded}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.headerText}>🛠️ Dev Tools</Text>
        <Text style={styles.headerIcon}>{state.isExpanded ? '−' : '+'}</Text>
      </Pressable>

      {state.isExpanded && (
        <View style={styles.content}>
          <Pressable style={styles.toggleRow} onPress={toggleInputDebug}>
            <Text style={styles.checkbox}>{state.showInputDebug ? '☑' : '☐'}</Text>
            <Text style={styles.label}>Input Debug</Text>
          </Pressable>

          <Pressable style={styles.toggleRow} onPress={togglePhysicsShapes}>
            <Text style={styles.checkbox}>{state.showPhysicsShapes ? '☑' : '☐'}</Text>
            <Text style={styles.label}>Physics Shapes</Text>
          </Pressable>

          <Pressable style={styles.toggleRow} onPress={toggleFPS}>
            <Text style={styles.checkbox}>{state.showFPS ? '☑' : '☐'}</Text>
            <Text style={styles.label}>Show FPS</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(31, 41, 55, 0.95)',
    borderTopLeftRadius: 8,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#4B5563',
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 9999,
  },
  containerExpanded: {
    minWidth: 200,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  headerIcon: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    padding: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  checkbox: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
    textAlign: 'center',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 13,
  },
});
