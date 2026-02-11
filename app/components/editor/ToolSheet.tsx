import { useRef, useMemo, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import type { EditorTab } from "./EditorProvider";
import { LayersPanel } from "./panels/LayersPanel";
import { PropertiesPanel } from "./panels/PropertiesPanel";
import { DebugPanel } from "./panels/DebugPanel";
import { AssetsPanel } from "./panels/AssetsPanel";
import { AssetGalleryPanel } from "./AssetGallery/AssetGalleryPanel";

const TAB_TITLES: Record<string, string> = {
  gallery: "Images",
  assets: "Add",
  properties: "Properties",
  layers: "Layers",
  debug: "Debug",
};

interface ToolSheetProps {
  activeTab: EditorTab | null;
  onDismiss: () => void;
}

export function ToolSheet({ activeTab, onDismiss }: ToolSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["50%", "90%"], []);

  const renderHandle = useCallback(
    () => (
      <View style={styles.handleContainer}>
        <View style={styles.handleIndicator} />
        <View style={styles.headerRow}>
          <Pressable onPress={onDismiss} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close tool sheet">
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>{TAB_TITLES[activeTab ?? ""] ?? ""}</Text>
          <View style={styles.closeButton} />
        </View>
      </View>
    ),
    [onDismiss, activeTab]
  );

  const renderContent = useCallback(() => {
    switch (activeTab) {
      case "gallery":
        return <AssetGalleryPanel onPrefabPress={() => {}} />;
      case "assets":
        return <AssetsPanel />;
      case "properties":
        return <PropertiesPanel />;
      case "layers":
        return <LayersPanel />;
      case "debug":
        return <DebugPanel />;
      default:
        return null;
    }
  }, [activeTab]);

  if (!activeTab) return null;

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      backgroundStyle={styles.sheetBackground}
      handleComponent={renderHandle}
      style={styles.sheetShadow}
      enablePanDownToClose
      onClose={onDismiss}
      enableDynamicSizing={false}
    >
      <BottomSheetScrollView contentContainerStyle={styles.contentContainer}>
        {renderContent()}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.125,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetBackground: {
    backgroundColor: "#1F2937",
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: "#1F2937",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#6B7280",
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    width: "100%",
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  contentContainer: {
    flexGrow: 1,
  },
});
