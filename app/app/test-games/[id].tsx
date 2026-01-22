import { useMemo, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WithSkia } from "@/components/WithSkia";
import { FullScreenHeader } from "@/components/FullScreenHeader";
import { TESTGAMES_BY_ID, loadTestGame, type TestGameId } from "@/lib/registry/generated/testGames";
import { trpc } from "@/lib/trpc/client";
import type { GameDefinition } from "@slopcade/shared";

export default function TestGameRunScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useMemo(() => (id && id in TESTGAMES_BY_ID ? TESTGAMES_BY_ID[id as TestGameId] : undefined), [id]);

  const [runtimeKey, setRuntimeKey] = useState(0);
  const [renderMode, setRenderMode] = useState<'default' | 'primitive'>('default');
  const [showOverlays, setShowOverlays] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const loadedDefinitionRef = useRef<GameDefinition | null>(null);

  const handleBack = useCallback(() => router.back(), [router]);
  const handleReset = useCallback(() => setRuntimeKey((k) => k + 1), []);

  const handleSaveToLibrary = useCallback(async () => {
    if (!entry || !loadedDefinitionRef.current) {
      Alert.alert("Error", "Game not loaded yet");
      return;
    }

    setIsSaving(true);
    try {
      const definition = loadedDefinitionRef.current;
      const result = await trpc.games.create.mutate({
        title: definition.metadata.title,
        description: definition.metadata.description,
        definition: JSON.stringify(definition),
        isPublic: false,
      });

      Alert.alert(
        "Saved!",
        "Game saved to library. Opening in Play mode where you can generate assets.",
        [
          {
            text: "Open",
            onPress: () => router.push(`/play/${result.id}`),
          },
        ]
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save game";
      Alert.alert("Error", message);
    } finally {
      setIsSaving(false);
    }
  }, [entry, router]);

  const toggleDebug = () => {
    if (renderMode === 'default' && !showOverlays) {
      setShowOverlays(true);
    } else if (renderMode === 'default' && showOverlays) {
      setRenderMode('primitive');
      setShowOverlays(false);
    } else if (renderMode === 'primitive' && !showOverlays) {
      setShowOverlays(true);
    } else {
      setRenderMode('default');
      setShowOverlays(false);
    }
  };

  if (!entry) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center p-6">
        <Text className="text-red-400 text-center text-lg">Unknown test game: {id}</Text>
        <Pressable className="mt-6 py-3 px-6 bg-gray-700 rounded-lg" onPress={handleBack}>
          <Text className="text-white font-semibold">← Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-gray-900">
      <FullScreenHeader
        onBack={handleBack}
        title={entry.meta.title}
        showBackground
        rightContent={
          <View className="flex-row gap-2">
            <Pressable
              className={`py-2 px-3 rounded-lg ${showOverlays || renderMode === 'primitive' ? 'bg-yellow-600' : 'bg-black/60'}`}
              onPress={toggleDebug}
            >
              <Text className="text-white font-bold text-xs">
                {renderMode === 'primitive' ? 'PRIM' : 'VIS'}
                {showOverlays ? '+DBG' : ''}
              </Text>
            </Pressable>
            <Pressable
              className={`py-2 px-3 rounded-lg ${isSaving ? 'bg-indigo-800' : 'bg-indigo-600'}`}
              onPress={handleSaveToLibrary}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-bold text-xs">💾 Save</Text>
              )}
            </Pressable>
            <Pressable className="py-2 px-4 bg-black/60 rounded-lg" onPress={handleReset}>
              <Text className="text-white font-semibold">Reset</Text>
            </Pressable>
          </View>
        }
      />

      <WithSkia
        key={runtimeKey}
        getComponent={() =>
          Promise.all([
            import("@/lib/game-engine/GameRuntime.native"),
            loadTestGame(entry.id),
          ]).then(([mod, definition]) => {
            loadedDefinitionRef.current = definition;
            return {
              default: () => (
                <mod.GameRuntime
                  definition={definition}
                  showHUD={true}
                  onBackToMenu={handleBack}
                  onRequestRestart={handleReset}
                  renderMode={renderMode}
                  showDebugOverlays={showOverlays}
                />
              ),
            };
          })
        }
        fallback={
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#4CAF50" />
          </View>
        }
      />
    </View>
  );
}
