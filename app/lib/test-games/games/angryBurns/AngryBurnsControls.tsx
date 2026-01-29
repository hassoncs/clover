import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, TextInput, Alert } from 'react-native';
import type { LevelDefinition } from '@slopcade/shared';
import { addToFavorites, getFavoritesCount } from './favoritesStorage';

interface AngryBurnsControlsProps {
  difficulty01: number;
  onDifficultyChange: (value: number) => void;
  seed: string;
  onSeedChange: (value: string) => void;
  levelIndex: number;
  onNextLevel: () => void;
  currentLevel: LevelDefinition | null;
  onBrowseFavorites: () => void;
}

export function AngryBurnsControls({
  difficulty01,
  onDifficultyChange,
  seed,
  onSeedChange,
  levelIndex,
  onNextLevel,
  currentLevel,
  onBrowseFavorites,
}: AngryBurnsControlsProps) {
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [isAddingFavorite, setIsAddingFavorite] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadCount = async () => {
      const count = await getFavoritesCount();
      if (mounted) setFavoritesCount(count);
    };
    loadCount();
    return () => { mounted = false; };
  }, []);

  const handleAddToFavorites = useCallback(async () => {
    if (!currentLevel || isAddingFavorite) return;

    setIsAddingFavorite(true);
    try {
      const success = await addToFavorites(currentLevel);
      if (success) {
        const newCount = await getFavoritesCount();
        setFavoritesCount(newCount);
        Alert.alert('Favorite Saved', 'Level added to your favorites!');
      } else {
        Alert.alert('Already Favorite', 'This level is already in your favorites.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save favorite. Please try again.');
    } finally {
      setIsAddingFavorite(false);
    }
  }, [currentLevel, isAddingFavorite]);

  const handleRandomizeSeed = useCallback(() => {
    const randomSeed = Math.random().toString(36).substring(2, 10);
    onSeedChange(randomSeed);
  }, [onSeedChange]);

  const handleDifficultyDecrease = useCallback(() => {
    onDifficultyChange(Math.max(0, difficulty01 - 0.05));
  }, [difficulty01, onDifficultyChange]);

  const handleDifficultyIncrease = useCallback(() => {
    onDifficultyChange(Math.min(1, difficulty01 + 0.05));
  }, [difficulty01, onDifficultyChange]);

  return (
    <View className="bg-gray-800 p-4 rounded-lg m-2">
      <Text className="text-white text-lg font-bold mb-3">Level Controls</Text>

      <View className="mb-3">
        <Text className="text-gray-300 text-sm mb-1">Difficulty: {Math.round(difficulty01 * 100)}%</Text>
        <View className="flex-row items-center">
          <Pressable
            onPress={handleDifficultyDecrease}
            className="bg-gray-700 py-2 px-3 rounded-l"
          >
            <Text className="text-white text-lg">−</Text>
          </Pressable>
          <View className="flex-1 h-8 bg-gray-700 justify-center px-2">
            <View
              className="h-2 bg-green-500 rounded"
              style={{ width: `${difficulty01 * 100}%` }}
            />
          </View>
          <Pressable
            onPress={handleDifficultyIncrease}
            className="bg-gray-700 py-2 px-3 rounded-r"
          >
            <Text className="text-white text-lg">+</Text>
          </Pressable>
        </View>
        <View className="flex-row justify-between mt-1">
          <Text className="text-gray-500 text-xs">Easy</Text>
          <Text className="text-gray-500 text-xs">Hard</Text>
        </View>
      </View>

      <View className="mb-3">
        <Text className="text-gray-300 text-sm mb-1">Seed: {seed}</Text>
        <TextInput
          value={seed}
          onChangeText={onSeedChange}
          className="bg-gray-700 text-white p-2 rounded border border-gray-600"
          placeholder="Enter seed..."
          placeholderTextColor="#666666"
        />
        <Pressable
          onPress={handleRandomizeSeed}
          className="mt-1 py-1 px-2 bg-gray-700 rounded self-start"
        >
          <Text className="text-gray-300 text-xs">Randomize</Text>
        </Pressable>
      </View>

      <View className="mb-3">
        <Text className="text-gray-300 text-sm">Level Index: {levelIndex}</Text>
      </View>

      <Pressable
        onPress={onNextLevel}
        className="bg-green-600 py-2 px-4 rounded mb-2"
      >
        <Text className="text-white font-semibold text-center">Next Level</Text>
      </Pressable>

      <Pressable
        onPress={handleAddToFavorites}
        disabled={!currentLevel || isAddingFavorite}
        className={`py-2 px-4 rounded mb-2 ${
          currentLevel && !isAddingFavorite ? 'bg-blue-600' : 'bg-gray-600'
        }`}
      >
        <Text className="text-white font-semibold text-center">
          {isAddingFavorite ? 'Saving...' : `★ Add to Favorites (${favoritesCount})`}
        </Text>
      </Pressable>

      <Pressable
        onPress={onBrowseFavorites}
        className="bg-indigo-600 py-2 px-4 rounded"
      >
        <Text className="text-white font-semibold text-center">★ Browse Favorites</Text>
      </Pressable>
    </View>
  );
}
