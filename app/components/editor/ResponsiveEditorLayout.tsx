import { View, StyleSheet } from 'react-native';
import { useShouldShowSidebar } from '@/lib/hooks/useDeviceType';
import { StageArea } from './StageArea';
import { BottomSheetHost } from './BottomSheetHost';
import { Sidebar } from './sidebar/Sidebar';
import { ChatSidebar } from './ChatSidebar';
import { InspectorProvider } from './inspector/InspectorProvider';
import { InspectOverlay } from './inspector/InspectOverlay';

export function ResponsiveEditorLayout() {
  const showSidebar = useShouldShowSidebar();

  return (
    <InspectorProvider>
      <View style={styles.container}>
        {showSidebar ? (
          <View style={styles.desktopLayout}>
            <Sidebar style={styles.sidebar} />
            <View style={styles.viewport}>
              <StageArea />
              <InspectOverlay />
            </View>
            <ChatSidebar style={styles.chatSidebar} />
          </View>
        ) : (
          <View style={styles.mobileLayout}>
            <StageArea />
            <BottomSheetHost />
          </View>
        )}
      </View>
    </InspectorProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  desktopLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  mobileLayout: {
    flex: 1,
  },
  sidebar: {
    width: 320,
    borderRightWidth: 1,
    borderRightColor: '#374151',
  },
  viewport: {
    flex: 1,
  },
  chatSidebar: {
    width: 360,
    borderLeftWidth: 1,
    borderLeftColor: '#374151',
  },
});
