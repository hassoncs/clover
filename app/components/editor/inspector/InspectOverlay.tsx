import { View, Text, StyleSheet } from 'react-native';
import { useInspector } from './InspectorProvider';

export function InspectOverlay() {
  const { hoveredEntityId, selectedEntityId, inspectMode } = useInspector();

  if (!inspectMode && !hoveredEntityId && !selectedEntityId) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {hoveredEntityId && (
        <View style={styles.hoverTooltip}>
          <View style={styles.hoverLabel}>
            <View style={styles.hoverDot} />
            <View>
              <Text style={styles.hoverText}>{hoveredEntityId}</Text>
              <Text style={styles.hoverHint}>Click to select</Text>
            </View>
          </View>
        </View>
      )}
      
      {selectedEntityId && (
        <View style={styles.selectionInfo}>
          <View style={styles.selectionLabel}>
            <View style={styles.selectionDot} />
            <View>
              <Text style={styles.selectionText}>{selectedEntityId}</Text>
              <Text style={styles.selectionHint}>Selected</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hoverTooltip: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  hoverLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hoverDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FBBF24',
  },
  hoverText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  hoverHint: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  selectionInfo: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  selectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#60A5FA',
  },
  selectionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  selectionHint: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
});
