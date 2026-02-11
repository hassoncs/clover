import { View, StyleSheet, ViewStyle } from 'react-native';
import { HierarchyPanel } from './HierarchyPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { DebugPanel } from './DebugPanel';

interface SidebarProps {
  style?: ViewStyle;
}

export function Sidebar({ style }: SidebarProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.panel}>
        <HierarchyPanel />
      </View>
      <View style={styles.divider} />
      <View style={styles.panel}>
        <PropertiesPanel />
      </View>
      <View style={styles.divider} />
      <View style={styles.panelSmall}>
        <DebugPanel />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  panel: {
    flex: 2,
  },
  panelSmall: {
    flex: 1,
  },
  divider: {
    height: 4,
    backgroundColor: '#374151',
  },
});
