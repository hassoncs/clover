import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { useEditor } from "./EditorProvider";
import { trpc } from "@/lib/trpc/client";

export function EditorTopBar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isSaving, setIsSaving] = useState(false);
  const {
    gameId,
    mode,
    toggleMode,
    document,
    canUndo,
    canRedo,
    undo,
    redo,
    isDirty,
    isEphemeral,
    ephemeralSource,
  } = useEditor();

  const handleBack = () => {
    router.back();
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      if (isEphemeral) {
        const result = await trpc.games.create.mutate({
          title: document.metadata.title,
          description: document.metadata.description,
          definition: JSON.stringify(document),
          isPublic: false,
        });
        router.replace(`/editor/${result.id}`);
      } else if (gameId !== "preview") {
        await trpc.games.update.mutate({
          id: gameId,
          title: document.metadata.title,
          description: document.metadata.description,
          definition: JSON.stringify(document),
        });
      }
    } catch (err) {
      console.error("Failed to save game:", err);
      Alert.alert(
        "Save Failed",
        err instanceof Error ? err.message : "An error occurred while saving"
      );
    } finally {
      setIsSaving(false);
    }
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

      <View className="flex-row gap-2">
        {(isEphemeral || isDirty) && (
          <Pressable
            className={`px-4 py-2 rounded-lg active:opacity-80 ${
              isSaving ? "bg-gray-600" : "bg-green-600"
            }`}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white font-bold text-sm">
                {isEphemeral ? "💾 SAVE" : "💾 SAVE"}
              </Text>
            )}
          </Pressable>
        )}

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
    </View>
  );
}
