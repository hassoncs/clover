import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { View, Text, Pressable, ActivityIndicator, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FullScreenHeader } from "@/components/FullScreenHeader";
import { AssetLoadingScreen } from "@/components/game";
import { useGamePreloader } from "@/lib/hooks/useGamePreloader";
import { getStorageItem } from "@/lib/utils/storage";
import type { GameDefinition } from "@slopcade/shared";
import type { ResolvedPackEntry } from "@/lib/assets/AssetManifest";
import { mergeAssetsIntoTemplates } from "@/lib/assets/mergeAssetsIntoTemplates";
import { EMBEDDED_GAME_JSONS, EMBEDDED_ASSET_MANIFESTS } from "@/lib/offline/embedded-games-registry";

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

  const activePackId = gameDefinition?.assetSystem?.activePackId;

  // Get pack data from embedded asset manifests (synchronous)
  const packData = useMemo(() => {
    if (!id || !activePackId) return null;
    const manifest = EMBEDDED_ASSET_MANIFESTS[id as string];
    if (!manifest) return null;
    
    const entries = Object.entries(manifest).map(([templateId, entry]) => ({
      templateId,
      r2Key: entry.r2Key,
      file: entry.file,
      imageUrl: null,
      placement: null,
    }));
    
    return { id: activePackId, entries };
  }, [id, activePackId]);

  const resolvedPackEntries = useMemo(() => {
    if (!packData?.entries) {
      console.log('[test-games] No pack entries found');
      return undefined;
    }
    const result: Record<string, ResolvedPackEntry> = {};
    const { getAssetUrl } = require('@slopcade/shared');
    const { getServerUrl } = require('@/lib/offline/local-asset-server');
    
    console.log('[test-games] Resolving asset pack entries:', packData.entries.length);
    for (const entry of packData.entries) {
      if (entry.file) {
        const fullUrl = getAssetUrl(entry.file, '', {
          offlineMode: true,
          localServerUrl: getServerUrl(),
          gameId: id,
        });
        result[entry.templateId] = {
          imageUrl: fullUrl,
          placement: entry.placement ?? undefined,
        };
        console.log(`[test-games] ✅ Resolved ${entry.templateId}: ${fullUrl.slice(-40)}`);
      }
    }
    console.log('[test-games] Total resolved assets:', Object.keys(result).length);
    return result;
  }, [packData, id]);

  const enrichedDefinition = useMemo(() => {
    if (!gameDefinition) return null;
    console.log('[test-games] 🔄 Merging assets into game definition...', {
      hasAssets: !!resolvedPackEntries,
      assetCount: resolvedPackEntries ? Object.keys(resolvedPackEntries).length : 0,
    });
    return mergeAssetsIntoTemplates(gameDefinition, resolvedPackEntries);
  }, [gameDefinition, resolvedPackEntries]);

  const { phase, progress, imageUrls, startPreload, skipPreload, reset } = useGamePreloader(
    gameDefinition,
    { resolvedPackEntries }
  );

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

  // Load game from embedded game JSONs (template games only)
  useEffect(() => {
    if (!id) return;

    const load = () => {
      setIsLoadingDefinition(true);
      setError(null);
      try {
        console.log('[test-games] Loading game from embedded registry:', id, 'level:', currentLevel);
        const gameJson = EMBEDDED_GAME_JSONS[id] as { title?: string; definition?: GameDefinition } | undefined;
        if (!gameJson) {
          throw new Error(`Game not found: ${id}`);
        }
        const definition = gameJson.definition as GameDefinition;
        console.log('[test-games] Loaded game:', definition.metadata.title);
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

  const handlePreviousLevel = useCallback(() => {
    console.log('[test-games] Previous level requested, current:', currentLevel);
    if (currentLevel > 1) {
      // Decrement level - this will trigger a re-fetch of the game definition
      setCurrentLevel((prev) => Math.max(1, prev - 1));
      // Reset game state for the new level
      reset();
      setGodotReady(false);
      setLoadingDismissed(false);
      loadingOpacity.setValue(1);
      setRuntimeKey((k) => k + 1);
    }
  }, [currentLevel, reset, loadingOpacity]);

  const handleGameEnd = useCallback(async () => {
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

  if (!enrichedDefinition) {
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
  const canMountGame = !isLoadingDefinition && enrichedDefinition !== null;
  const showLoadingOverlay = false; // Disabled for debugging

  return (
    <View className="flex-1 bg-gray-900">
      <FullScreenHeader
        onBack={handleBack}
        showBackground
      />

      {canMountGame && (() => {
        console.log('[test-games] 🚀 Mounting GameRuntime (assets merged into definition)');
        return (
          <GameRuntimeWrapper
            key={runtimeKey}
            definition={enrichedDefinition!}
            imageUrls={imageUrls}
            onBackToMenu={handleBack}
            onRequestRestart={handleReset}
            onGameEnd={handleGameEnd}
            onNextLevel={handleNextLevel}
            onPreviousLevel={handlePreviousLevel}
            debugMode={isDebugMode}
            onReady={handleGodotReady}
          />
        );
      })()}

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
            gameTitle={enrichedDefinition!.metadata.title}
            progress={progress}
            config={enrichedDefinition!.loadingScreen}
            titleHeroImageUrl={enrichedDefinition!.metadata.titleHeroImageUrl}
            instructions={enrichedDefinition!.metadata.instructions}
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
  onPreviousLevel?: () => void;
  debugMode: boolean;
  onReady?: () => void;
}

function GameRuntimeWrapper({ definition, imageUrls, onBackToMenu, onRequestRestart, onGameEnd, onNextLevel, onPreviousLevel, debugMode, onReady }: GameRuntimeWrapperProps) {
  const [GameRuntime, setGameRuntime] = useState<React.ComponentType<{
    definition: GameDefinition;
    showHUD: boolean;
    onBackToMenu: () => void;
    onRequestRestart: () => void;
    onGameEnd?: (state: "won" | "lost") => void;
    onNextLevel?: () => void;
    onPreviousLevel?: () => void;
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
      onPreviousLevel={onPreviousLevel}
      debugMode={debugMode}
      preloadTextureUrls={imageUrls}
      onReady={onReady}
    />
  );
}
