import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WithGodot } from "@/components/WithGodot";
import { FullScreenHeader } from "@/components/FullScreenHeader";
import { AssetLoadingScreen } from "@/components/game";
import { TESTGAMES_BY_ID, loadTestGame, type TestGameId } from "@/lib/registry/generated/testGames";
import { trpc } from "@/lib/trpc/client";
import { useGamePreloader } from "@/lib/hooks/useGamePreloader";
import type { GameDefinition } from "@slopcade/shared";

export default function TestGameRunScreen() {
  const router = useRouter();
  const { id, autostart } = useLocalSearchParams<{ id: string; autostart?: string }>();
  const shouldAutoStart = autostart === "true" || autostart === "1";
  const entry = useMemo(() => (id && id in TESTGAMES_BY_ID ? TESTGAMES_BY_ID[id as TestGameId] : undefined), [id]);

  const [runtimeKey, setRuntimeKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDefinition, setIsLoadingDefinition] = useState(true);
  const [gameDefinition, setGameDefinition] = useState<GameDefinition | null>(null);
  const loadedDefinitionRef = useRef<GameDefinition | null>(null);

  const { phase, progress, startPreload, skipPreload, reset } = useGamePreloader(gameDefinition);

  useEffect(() => {
    if (!entry) return;
    
    const load = async () => {
      setIsLoadingDefinition(true);
      try {
        const definition = await loadTestGame(entry.id);
        loadedDefinitionRef.current = definition;
        setGameDefinition(definition);
      } catch (err) {
        console.error('Failed to load test game:', err);
      } finally {
        setIsLoadingDefinition(false);
      }
    };
    
    load();
  }, [entry]);

  useEffect(() => {
    if (gameDefinition && !isLoadingDefinition && phase === 'idle') {
      startPreload();
    }
  }, [gameDefinition, isLoadingDefinition, phase, startPreload]);

  const handleBack = useCallback(() => router.back(), [router]);
  
  const handleReset = useCallback(() => {
    reset();
    setRuntimeKey((k) => k + 1);
    startPreload();
  }, [reset, startPreload]);

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

  if (isLoadingDefinition) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text className="text-white mt-4">Loading game...</Text>
      </SafeAreaView>
    );
  }

  if (!gameDefinition) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center p-6">
        <Text className="text-red-400 text-center text-lg">Failed to load game</Text>
        <Pressable className="mt-6 py-3 px-6 bg-gray-700 rounded-lg" onPress={handleBack}>
          <Text className="text-white font-semibold">← Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (phase === 'loading') {
    return (
      <AssetLoadingScreen
        gameTitle={gameDefinition.metadata.title}
        progress={progress}
        config={gameDefinition.loadingScreen}
        titleHeroImageUrl={gameDefinition.metadata.titleHeroImageUrl}
        onSkip={skipPreload}
      />
    );
  }

  const isGameReady = phase === 'ready' || phase === 'skipped';

  return (
    <View className="flex-1 bg-gray-900">
      <FullScreenHeader
        onBack={handleBack}
        title={entry.meta.title}
        showBackground
        rightContent={
          <View className="flex-row gap-2">
            <Pressable
              className={`py-2 px-3 rounded-lg ${isSaving ? 'bg-indigo-800' : 'bg-indigo-600'}`}
              onPress={handleSaveToLibrary}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-bold text-xs">Save</Text>
              )}
            </Pressable>
            <Pressable className="py-2 px-4 bg-black/60 rounded-lg" onPress={handleReset}>
              <Text className="text-white font-semibold">Reset</Text>
            </Pressable>
          </View>
        }
      />

      {isGameReady && (
        <WithGodot
          key={runtimeKey}
          getComponent={() =>
            import("@/lib/game-engine/GameRuntime.godot").then((mod) => ({
              default: () => (
                <mod.GameRuntimeGodot
                  definition={gameDefinition}
                  showHUD={true}
                  onBackToMenu={handleBack}
                  onRequestRestart={handleReset}
                  autoStart={shouldAutoStart}
                />
              ),
            }))
          }
          fallback={
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#4CAF50" />
            </View>
          }
        />
      )}
    </View>
  );
}
