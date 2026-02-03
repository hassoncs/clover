import { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FullScreenHeader } from "@/components/FullScreenHeader";
import { AssetLoadingScreen } from "@/components/game";
import { trpc } from "@/lib/trpc/client";
import { useGamePreloader } from "@/lib/hooks/useGamePreloader";
import { getStorageItem } from "@/lib/utils/storage";
import type { GameDefinition } from "@slopcade/shared";

export default function TestGameRunScreen() {
  const router = useRouter();
  const { id, debug } = useLocalSearchParams<{ id: string; debug?: string }>();
  const isDebugMode = debug === "true" || debug === "1";

  const [runtimeKey, setRuntimeKey] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [isLoadingDefinition, setIsLoadingDefinition] = useState(true);
  const [gameDefinition, setGameDefinition] = useState<GameDefinition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [godotReady, setGodotReady] = useState(false);
  const [loadingDismissed, setLoadingDismissed] = useState(false);
  const loadingOpacity = useRef(new Animated.Value(1)).current;

  const { phase, progress, imageUrls, startPreload, skipPreload, reset } = useGamePreloader(gameDefinition);

  // Load saved level from storage on mount
  useEffect(() => {
    const loadSavedLevel = async () => {
      if (!id) return;
      try {
        // Check for saved progress to get current level
        const storageKey = id === 'ballSort' ? 'ball-sort-progress' : `game-progress-${id}`;
        const saved = await getStorageItem<{ currentLevel?: number }>(storageKey, {});
        if (saved?.currentLevel && saved.currentLevel > 0) {
          console.log('[test-games] Loaded saved level:', saved.currentLevel);
          setCurrentLevel(saved.currentLevel);
        }
      } catch (err) {
        console.warn('[test-games] Could not load saved level:', err);
      }
    };
    loadSavedLevel();
  }, [id]);

  // Fetch game from API (works for both test games and DB games)
  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setIsLoadingDefinition(true);
      setError(null);
      try {
        console.log('[test-games] Fetching game from API:', id, 'level:', currentLevel);
        const game = await trpc.games.getPublic.query({ id, level: currentLevel });
        const definition = JSON.parse(game.definition) as GameDefinition;
        console.log('[test-games] Loaded game:', definition.metadata.title, 'level:', currentLevel);
        setGameDefinition(definition);
      } catch (err) {
        console.error('[test-games] Failed to load game:', err);
        setError(err instanceof Error ? err.message : 'Failed to load game');
      } finally {
        setIsLoadingDefinition(false);
      }
    };

    load();
  }, [id, currentLevel]);

  useEffect(() => {
    if (gameDefinition && !isLoadingDefinition && phase === 'idle') {
      startPreload();
    }
  }, [gameDefinition, isLoadingDefinition, phase, startPreload]);

  const handleGodotReady = useCallback(() => {
    setGodotReady(true);
    Animated.timing(loadingOpacity, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setLoadingDismissed(true);
    });
  }, [loadingOpacity]);

  const handleBack = useCallback(() => router.back(), [router]);

  const handleReset = useCallback(() => {
    reset();
    setGodotReady(false);
    setLoadingDismissed(false);
    loadingOpacity.setValue(1);
    setRuntimeKey((k) => k + 1);
    startPreload();
  }, [reset, startPreload, loadingOpacity]);

  const handleNextLevel = useCallback(() => {
    console.log('[test-games] Next level requested, current:', currentLevel);
    // Increment level - this will trigger a re-fetch of the game definition
    setCurrentLevel((prev) => prev + 1);
    // Reset game state for the new level
    reset();
    setGodotReady(false);
    setLoadingDismissed(false);
    loadingOpacity.setValue(1);
    setRuntimeKey((k) => k + 1);
  }, [currentLevel, reset, loadingOpacity]);

  const handleGameEnd = useCallback(async (state: "won" | "lost") => {
    // Auto-save logic moved to GameRuntime "Next Level" button
  }, []);

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center p-6">
        <Text className="text-red-400 text-center text-lg">{error}</Text>
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

  // TEMP: Skip preloading to debug freeze issue
  const canMountGame = !isLoadingDefinition && gameDefinition !== null;
  const showLoadingOverlay = false; // Disabled for debugging

  return (
    <View className="flex-1 bg-gray-900">
      <FullScreenHeader
        onBack={handleBack}
        showBackground
      />

      {canMountGame && (
        <GameRuntimeWrapper
          key={runtimeKey}
          definition={gameDefinition}
          imageUrls={imageUrls}
          onBackToMenu={handleBack}
          onRequestRestart={handleReset}
          onGameEnd={handleGameEnd}
          onNextLevel={handleNextLevel}
          debugMode={isDebugMode}
          onReady={handleGodotReady}
        />
      )}

      {showLoadingOverlay && (
        <Animated.View 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 20,
            opacity: loadingOpacity,
          }}
          pointerEvents={godotReady ? 'none' : 'auto'}
        >
          <AssetLoadingScreen
            gameTitle={gameDefinition.metadata.title}
            progress={progress}
            config={gameDefinition.loadingScreen}
            titleHeroImageUrl={gameDefinition.metadata.titleHeroImageUrl}
            instructions={gameDefinition.metadata.instructions}
            onSkip={godotReady ? undefined : skipPreload}
          />
        </Animated.View>
      )}
    </View>
  );
}

interface GameRuntimeWrapperProps {
  definition: GameDefinition;
  imageUrls: string[];
  onBackToMenu: () => void;
  onRequestRestart: () => void;
  onGameEnd?: (state: "won" | "lost") => void;
  onNextLevel?: () => void;
  debugMode: boolean;
  onReady?: () => void;
}

function GameRuntimeWrapper({ definition, imageUrls, onBackToMenu, onRequestRestart, onGameEnd, onNextLevel, debugMode, onReady }: GameRuntimeWrapperProps) {
  const [GameRuntime, setGameRuntime] = useState<React.ComponentType<{
    definition: GameDefinition;
    showHUD: boolean;
    onBackToMenu: () => void;
    onRequestRestart: () => void;
    onGameEnd?: (state: "won" | "lost") => void;
    onNextLevel?: () => void;
    debugMode: boolean;
    preloadTextureUrls?: string[];
    onReady?: () => void;
  }> | null>(null);

  useEffect(() => {
      import("@/lib/game-engine/GameRuntime.godot").then((mod) => {
        setGameRuntime(() => mod.GameRuntimeGodotWithDevTools);
      });
  }, []);

  if (!GameRuntime) {
    return null;
  }

  return (
    <GameRuntime
      definition={definition}
      showHUD={!debugMode}
      onBackToMenu={onBackToMenu}
      onRequestRestart={onRequestRestart}
      onGameEnd={onGameEnd}
      onNextLevel={onNextLevel}
      debugMode={debugMode}
      preloadTextureUrls={imageUrls}
      onReady={onReady}
    />
  );
}
