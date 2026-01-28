import { Panel, PanelGroup, PanelResizeHandle } from 'react-native-resizable-panels';
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
      <PanelGroup direction="vertical" autoSaveId="editor-sidebar-layout">
        <Panel defaultSize={40} minSize={20} maxSize={60}>
          <HierarchyPanel />
        </Panel>
        
        <PanelResizeHandle style={styles.resizeHandle} />
        
        <Panel defaultSize={35} minSize={20}>
          <PropertiesPanel />
        </Panel>
        
        <PanelResizeHandle style={styles.resizeHandle} />
        
        <Panel defaultSize={25} minSize={10} collapsible>
          <DebugPanel />
        </Panel>
      </PanelGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  resizeHandle: {
    height: 4,
    backgroundColor: '#374151',
  },
});
