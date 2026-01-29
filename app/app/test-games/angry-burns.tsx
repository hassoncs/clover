import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, ActivityIndicator, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FullScreenHeader } from '@/components/FullScreenHeader';
import type { GameDefinition, LevelDefinition } from '@slopcade/shared';
import { AngryBurnsControls } from '@/lib/test-games/games/angryBurns/AngryBurnsControls';
import { AngryBurnsFavoritesBrowser } from '@/lib/test-games/games/angryBurns/AngryBurnsFavoritesBrowser';
import { useAngryBurnsGame } from '@/lib/test-games/games/angryBurns/useAngryBurnsGame';

export default function AngryBurnsScreen() {
  const router = useRouter();
  const [showFavorites, setShowFavorites] = useState(false);

  const {
    difficulty01,
    seed,
    levelIndex,
    currentLevel,
    gameDefinition,
    isLoading,
    runtimeKey,
    godotReady,
    loadingDismissed,
    setDifficulty01,
    setSeed,
    setLevelIndex,
    generateNewLevel,
    loadFavoriteLevel,
    removeFavorite,
    handleReset,
    handleGodotReady,
  } = useAngryBurnsGame();

  const loadingOpacity = useRef(new Animated.Value(loadingDismissed ? 0 : 1)).current;

  const handleBack = useCallback(() => router.back(), [router]);

  const handleBrowseFavorites = useCallback(() => {
    setShowFavorites(true);
  }, []);

  const handleCloseFavorites = useCallback(() => {
    setShowFavorites(false);
  }, []);

  const handleSelectFavorite = useCallback(
    async (level: LevelDefinition) => {
      try {
        await loadFavoriteLevel(level);
      } catch (error) {
        console.error('Failed to load favorite:', error);
        Alert.alert('Error', 'Failed to load the selected level.');
      }
    },
    [loadFavoriteLevel]
  );

  const handleDeleteFavorite = useCallback(
    async (levelId: string) => {
      try {
        const success = await removeFavorite(levelId);
        if (!success) {
          Alert.alert('Error', 'Failed to remove favorite.');
        }
      } catch (error) {
        console.error('Failed to delete favorite:', error);
        Alert.alert('Error', 'Failed to remove favorite.');
      }
    },
    [removeFavorite]
  );

  const handleNextLevel = useCallback(() => {
    setLevelIndex((prev) => prev + 1);
  }, [setLevelIndex]);

  const handleDifficultyChange = useCallback((value: number) => {
    setDifficulty01(value);
  }, [setDifficulty01]);

  const handleSeedChange = useCallback((value: string) => {
    setSeed(value);
  }, [setSeed]);

  const canMountGame = !isLoading && gameDefinition;
  const showLoadingOverlay = !loadingDismissed && isLoading;

  if (!gameDefinition && !isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center p-6">
        <Text className="text-red-400 text-center text-lg">Failed to load game</Text>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-gray-900">
      <FullScreenHeader onBack={handleBack} showBackground />

      <View className="flex-1 flex-row">
        <View className="flex-1">
          {canMountGame && (
            <GameRuntimeWrapper
              key={runtimeKey}
              definition={gameDefinition!}
              onBackToMenu={handleBack}
              onRequestRestart={handleReset}
              onReady={handleGodotReady}
            />
          )}
        </View>

        <View className="w-72 border-l border-gray-700">
          <AngryBurnsControls
            difficulty01={difficulty01}
            onDifficultyChange={handleDifficultyChange}
            seed={seed}
            onSeedChange={handleSeedChange}
            levelIndex={levelIndex}
            onNextLevel={handleNextLevel}
            currentLevel={currentLevel}
            onBrowseFavorites={handleBrowseFavorites}
          />
        </View>
      </View>

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
          <View className="flex-1 bg-gray-900 items-center justify-center">
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text className="text-white mt-4">Generating level...</Text>
          </View>
        </Animated.View>
      )}

      <AngryBurnsFavoritesBrowser
        visible={showFavorites}
        onClose={handleCloseFavorites}
        onSelectFavorite={handleSelectFavorite}
      />
    </View>
  );
}

interface GameRuntimeWrapperProps {
  definition: GameDefinition;
  onBackToMenu: () => void;
  onRequestRestart: () => void;
  onReady?: () => void;
}

function GameRuntimeWrapper({
  definition,
  onBackToMenu,
  onRequestRestart,
  onReady,
}: GameRuntimeWrapperProps) {
  const [GameRuntime, setGameRuntime] = useState<React.ComponentType<{
    definition: GameDefinition;
    showHUD: boolean;
    onBackToMenu: () => void;
    onRequestRestart: () => void;
    preloadTextureUrls?: string[];
    onReady?: () => void;
  }> | null>(null);

  React.useEffect(() => {
    import('@/lib/game-engine/GameRuntime.godot').then((mod) => {
      setGameRuntime(() => mod.GameRuntimeGodotWithDevTools);
    });
  }, []);

  if (!GameRuntime) {
    return null;
  }

  return (
    <GameRuntime
      definition={definition}
      showHUD={true}
      onBackToMenu={onBackToMenu}
      onRequestRestart={onRequestRestart}
      onReady={onReady}
    />
  );
}
