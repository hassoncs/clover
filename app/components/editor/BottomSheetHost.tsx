import { useRef, useMemo, useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useEditor, type EditorTab } from "./EditorProvider";
import { LayersPanel } from "./panels/LayersPanel";
import { PropertiesPanel } from "./panels/PropertiesPanel";
import { DebugPanel } from "./panels/DebugPanel";
import { AssetsPanel } from "./panels/AssetsPanel";
import { AIGenerateModal } from "./AIGenerateModal";

const TABS: { id: EditorTab; label: string }[] = [
  { id: "assets", label: "Assets" },
  { id: "properties", label: "Properties" },
  { id: "layers", label: "Layers" },
  { id: "debug", label: "Debug" },
];

export function BottomSheetHost() {
  const {
    mode,
    activeTab,
    setActiveTab,
    sheetSnapPoint,
    setSheetSnapPoint,
    selectedEntityId,
  } = useEditor();

  const sheetRef = useRef<BottomSheet>(null);
  const [aiModalVisible, setAiModalVisible] = useState(false);

  const snapPoints = useMemo(() => ["12%", "50%", "90%"], []);

  const handleSheetChange = useCallback(
    (index: number) => {
      setSheetSnapPoint(index as 0 | 1 | 2);
    },
    [setSheetSnapPoint]
  );

  if (mode === "playtest") {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={sheetSnapPoint}
      snapPoints={snapPoints}
      onChange={handleSheetChange}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      enablePanDownToClose={false}
    >
      <View style={styles.tabHeader}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDisabled = tab.id === "properties" && !selectedEntityId;

          return (
            <Pressable
              key={tab.id}
              style={[
                styles.tabButton,
                isActive && styles.tabButtonActive,
                isDisabled && styles.tabButtonDisabled,
              ]}
              onPress={() => !isDisabled && setActiveTab(tab.id)}
              disabled={isDisabled}
            >
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                  isDisabled && styles.tabLabelDisabled,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <BottomSheetScrollView style={styles.content}>
        {activeTab === "assets" && (
          <AssetsPanel onOpenAIModal={() => setAiModalVisible(true)} />
        )}
        {activeTab === "properties" && <PropertiesPanel />}
        {activeTab === "layers" && <LayersPanel />}
        {activeTab === "debug" && <DebugPanel />}
      </BottomSheetScrollView>

      <AIGenerateModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "#1F2937",
  },
  handleIndicator: {
    backgroundColor: "#6B7280",
    width: 40,
  },
  tabHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
    paddingHorizontal: 8,
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#6366F1",
  },
  tabButtonDisabled: {
    opacity: 0.4,
  },
  tabLabel: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "500",
  },
  tabLabelActive: {
    color: "#FFFFFF",
  },
  tabLabelDisabled: {
    color: "#6B7280",
  },
  content: {
    flex: 1,
  },
});
