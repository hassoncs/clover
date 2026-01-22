import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEditor } from "./EditorProvider";

export function EditorTopBar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    mode,
    toggleMode,
    document,
    canUndo,
    canRedo,
    undo,
    redo,
    isDirty,
  } = useEditor();

  const handleBack = () => {
    router.back();
  };

  return (
    <View
      className="flex-row items-center justify-between px-4 bg-gray-900 border-b border-gray-800"
      style={{ paddingTop: insets.top, height: 56 + insets.top }}
    >
      <Pressable
        className="w-10 h-10 items-center justify-center rounded-lg active:bg-gray-700"
        onPress={handleBack}
      >
        <Text className="text-white text-xl">←</Text>
      </Pressable>

      <View className="flex-row gap-1">
        <Pressable
          className={`w-10 h-10 items-center justify-center rounded-lg ${
            canUndo ? "bg-gray-700 active:bg-gray-600" : "bg-gray-800 opacity-40"
          }`}
          onPress={undo}
          disabled={!canUndo}
        >
          <Text className="text-white text-lg">↶</Text>
        </Pressable>
        <Pressable
          className={`w-10 h-10 items-center justify-center rounded-lg ${
            canRedo ? "bg-gray-700 active:bg-gray-600" : "bg-gray-800 opacity-40"
          }`}
          onPress={redo}
          disabled={!canRedo}
        >
          <Text className="text-white text-lg">↷</Text>
        </Pressable>
      </View>

      <View className="flex-1 mx-4">
        <Text
          className="text-white font-semibold text-base text-center"
          numberOfLines={1}
        >
          {document.metadata.title}
          {isDirty && <Text className="text-yellow-500"> •</Text>}
        </Text>
      </View>

      <Pressable
        className={`px-4 py-2 rounded-lg active:opacity-80 ${
          mode === "playtest" ? "bg-green-600" : "bg-indigo-600"
        }`}
        onPress={toggleMode}
      >
        <Text className="text-white font-bold text-sm">
          {mode === "playtest" ? "✏️ EDIT" : "▶ PLAY"}
        </Text>
      </Pressable>
    </View>
  );
}
