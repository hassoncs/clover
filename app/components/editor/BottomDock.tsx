import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEditor, type EditorTab } from "./EditorProvider";

interface DockItem {
  id: string;
  icon: string;
  label: string;
  tab?: EditorTab;
  requiresSelection?: boolean;
  action?: string;
}

const DOCK_ITEMS: DockItem[] = [
  { id: "gallery", icon: "🎨", label: "Assets", tab: "gallery" },
  { id: "add", icon: "➕", label: "Add", tab: "assets" },
  { id: "edit", icon: "✏️", label: "Edit", tab: "properties", requiresSelection: true },
  { id: "layers", icon: "📑", label: "Layers", tab: "layers" },
  { id: "debug", icon: "🐛", label: "Debug", tab: "debug" },
];

export function BottomDock() {
  const insets = useSafeAreaInsets();
  const {
    mode,
    activeTab,
    setActiveTab,
    setSheetSnapPoint,
    selectedEntityId,
    sheetSnapPoint,
  } = useEditor();

  if (mode === "playtest") {
    return null;
  }

  const handleDockPress = (item: DockItem) => {
    if (item.action === "showMoreMenu") {
      return;
    }

    if (item.tab) {
      setActiveTab(item.tab);
      if (sheetSnapPoint === 0) {
        setSheetSnapPoint(1);
      }
    }
  };

  return (
    <View
      className="flex-row justify-around items-center bg-gray-900 border-t border-gray-800"
      style={{ paddingBottom: insets.bottom, height: 60 + insets.bottom }}
    >
      {DOCK_ITEMS.map((item) => {
        const isActive = item.tab && activeTab === item.tab;
        const isDisabled = item.requiresSelection && !selectedEntityId;

        return (
          <Pressable
            key={item.id}
            className={`items-center py-2 px-4 ${
              isActive ? "opacity-100" : "opacity-60"
            } ${isDisabled ? "opacity-30" : ""}`}
            onPress={() => handleDockPress(item)}
            disabled={isDisabled}
          >
            <Text className="text-2xl">{item.icon}</Text>
            <Text
              className={`text-xs mt-1 ${
                isActive ? "text-indigo-400 font-semibold" : "text-white"
              }`}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
