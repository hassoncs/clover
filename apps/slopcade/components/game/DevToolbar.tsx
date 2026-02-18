import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useDevToolsOptional } from '@/lib/contexts/DevToolsContext';
import { useState } from 'react';

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
      {checked && <View style={styles.checkboxCheck} />}
    </View>
  );
}

export function DevToolbar() {
  const devTools = useDevToolsOptional();
  const [frame, setFrame] = useState(0);
  const [isStepping, setIsStepping] = useState(false);

  if (!devTools) {
    return null;
  }

  const { state, isLoading, toggleInputDebug, togglePhysicsShapes, toggleZones, toggleFPS, toggleExpanded } = devTools;

  if (isLoading) return null;

  const bridge = (typeof window !== 'undefined' && (window as any).SlopcadeDebugBridge) || null;
  const isInspectMode = bridge?.ready;

  const handleStep = async (frames: number) => {
    if (!bridge || isStepping) return;
    setIsStepping(true);
    try {
      const result = await bridge.step(frames);
      setFrame(result.endFrame);
    } catch (e) {
      console.error('Step failed:', e);
    } finally {
      setIsStepping(false);
    }
  };

  return (
    <View style={[styles.container, state.isExpanded && styles.containerExpanded]} pointerEvents="box-none">
      <Pressable
        style={styles.header}
        onPress={toggleExpanded}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={`${state.isExpanded ? 'Collapse' : 'Expand'} dev tools`}
      >
        <Text style={styles.headerText}>Dev Tools</Text>
        <Text style={styles.headerIcon}>{state.isExpanded ? '−' : '+'}</Text>
      </Pressable>

      {state.isExpanded && (
        <View style={styles.content}>
          {isInspectMode && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Frame Stepping</Text>
              <Text style={styles.frameCounter}>Frame: {frame}</Text>
              <View style={styles.buttonRow}>
                <Pressable
                  style={[styles.stepButton, isStepping && styles.stepButtonDisabled]}
                  onPress={() => handleStep(1)}
                  disabled={isStepping}
                  accessibilityRole="button"
                  accessibilityLabel="Step 1 frame"
                  accessibilityState={{ disabled: isStepping }}
                >
                  <Text style={styles.stepButtonText}>+1</Text>
                </Pressable>
                <Pressable
                  style={[styles.stepButton, isStepping && styles.stepButtonDisabled]}
                  onPress={() => handleStep(10)}
                  disabled={isStepping}
                  accessibilityRole="button"
                  accessibilityLabel="Step 10 frames"
                  accessibilityState={{ disabled: isStepping }}
                >
                  <Text style={styles.stepButtonText}>+10</Text>
                </Pressable>
                <Pressable
                  style={[styles.stepButton, isStepping && styles.stepButtonDisabled]}
                  onPress={() => handleStep(60)}
                  disabled={isStepping}
                  accessibilityRole="button"
                  accessibilityLabel="Step 60 frames"
                  accessibilityState={{ disabled: isStepping }}
                >
                  <Text style={styles.stepButtonText}>+60</Text>
                </Pressable>
              </View>
            </View>
          )}

          <Pressable style={styles.toggleRow} onPress={toggleInputDebug} accessibilityRole="button" accessibilityLabel="Toggle input debug" accessibilityState={{ selected: state.showInputDebug }}>
            <Checkbox checked={state.showInputDebug} />
            <Text style={styles.label}>Input Debug</Text>
          </Pressable>

          <Pressable style={styles.toggleRow} onPress={togglePhysicsShapes} accessibilityRole="button" accessibilityLabel="Toggle physics shapes" accessibilityState={{ selected: state.showPhysicsShapes }}>
            <Checkbox checked={state.showPhysicsShapes} />
            <Text style={styles.label}>Physics Shapes</Text>
          </Pressable>

          <Pressable style={styles.toggleRow} onPress={toggleZones} accessibilityRole="button" accessibilityLabel="Toggle zones" accessibilityState={{ selected: state.showZones }}>
            <Checkbox checked={state.showZones} />
            <Text style={styles.label}>Show Zones</Text>
          </Pressable>

          <Pressable style={styles.toggleRow} onPress={toggleFPS} accessibilityRole="button" accessibilityLabel="Toggle FPS display" accessibilityState={{ selected: state.showFPS }}>
            <Checkbox checked={state.showFPS} />
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
    ...(Platform.OS === 'web' ? { userSelect: 'none' } as any : {}),
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
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerIcon: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    padding: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  checkboxBox: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#6B7280',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F6',
  },
  checkboxCheck: {
    width: 6,
    height: 6,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  label: {
    color: '#D1D5DB',
    fontSize: 13,
  },
  section: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  sectionTitle: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  frameCounter: {
    color: '#FFFFFF',
    fontSize: 13,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 4,
  },
  stepButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    flex: 1,
    alignItems: 'center',
  },
  stepButtonDisabled: {
    backgroundColor: '#4B5563',
    opacity: 0.5,
  },
  stepButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
