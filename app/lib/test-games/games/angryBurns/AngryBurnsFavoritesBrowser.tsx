import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { LevelDefinition } from '@slopcade/shared';
import {
  getAllFavorites,
  removeFromFavorites,
  loadFavoritesPack,
} from './favoritesStorage';

export interface FavoriteLevel {
  levelId: string;
  title: string;
  seed: string;
  difficulty01?: number;
  savedAt: number;
  generatorId?: string;
  generatorVersion?: string;
  difficultyParams?: {
    initialLives?: number;
    targetTier?: string;
  };
}

interface AngryBurnsFavoritesBrowserProps {
  visible: boolean;
  onClose: () => void;
  onSelectFavorite: (level: LevelDefinition) => void;
}

function formatSavedDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function FavoriteItem({
  item,
  onPlay,
  onDelete,
  isDeleting,
}: {
  item: FavoriteLevel;
  onPlay: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}): React.JSX.Element {
  return (
    <View className="bg-gray-800 p-4 rounded-lg mb-3">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1 mr-3">
          <Text className="text-white font-semibold text-base" numberOfLines={1}>
            {item.title}
          </Text>
          <View className="flex-row items-center mt-1">
            <Text className="text-gray-400 text-xs">Seed: </Text>
            <Text className="text-gray-300 text-xs font-mono">{item.seed}</Text>
          </View>
          {item.difficulty01 !== undefined && (
            <Text className="text-yellow-500 text-xs mt-1">
              {Math.round(item.difficulty01 * 100)}% difficulty
            </Text>
          )}
        </View>
      </View>

      <View className="flex-row justify-between items-center pt-2 border-t border-gray-700">
        <Text className="text-gray-500 text-xs">{formatSavedDate(item.savedAt)}</Text>
        <View className="flex-row">
          <Pressable
            onPress={onDelete}
            disabled={isDeleting}
            className={`py-1.5 px-3 rounded mr-2 ${
              isDeleting ? 'bg-gray-600' : 'bg-red-900/50'
            }`}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Text className="text-red-400 text-xs font-medium">Delete</Text>
            )}
          </Pressable>
          <Pressable onPress={onPlay} className="bg-green-600 py-1.5 px-3 rounded">
            <Text className="text-white text-xs font-medium">Play</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function EmptyFavoritesView(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center py-10">
      <Text className="text-yellow-500 text-4xl mb-3">★</Text>
      <Text className="text-white text-lg font-semibold mb-2">No favorites yet</Text>
      <Text className="text-gray-400 text-sm text-center px-8">
        Generate levels and tap the star button to save your favorites here.
      </Text>
    </View>
  );
}

function LoadingView(): React.JSX.Element {
  return (
    <View className="flex-1 justify-center items-center py-10">
      <ActivityIndicator size="large" color="#4ade80" />
      <Text className="text-gray-400 text-sm mt-3">Loading favorites...</Text>
    </View>
  );
}

export function AngryBurnsFavoritesBrowser({
  visible,
  onClose,
  onSelectFavorite,
}: AngryBurnsFavoritesBrowserProps): React.JSX.Element {
  const [favorites, setFavorites] = useState<FavoriteLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    setIsLoading(true);
    try {
      const pack = await loadFavoritesPack();
      const favoritesList: FavoriteLevel[] = pack.levels.map((level) => {
        const metadata = level.metadata as Record<string, unknown> | undefined;
        const generatorParams = level.generatorParams as Record<string, unknown> | undefined;
        return {
          levelId: level.levelId,
          title: level.title || `Level ${level.levelId}`,
          seed: level.seed || 'unknown',
          difficulty01: generatorParams?.difficulty01 as number | undefined,
          savedAt: (metadata?.savedAt as number) || Date.now(),
          generatorId: level.generatorId,
          generatorVersion: level.generatorVersion,
        };
      });
      setFavorites(favoritesList);
    } catch (error) {
      console.error('Failed to load favorites:', error);
      Alert.alert('Error', 'Failed to load favorites. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadFavorites();
    }
  }, [visible, loadFavorites]);

  const handlePlay = useCallback(
    async (favorite: FavoriteLevel) => {
      try {
        const allFavorites = await getAllFavorites();
        const selectedLevel = allFavorites.find(
          (level) => level.levelId === favorite.levelId
        );
        if (selectedLevel) {
          onSelectFavorite(selectedLevel);
          onClose();
        }
      } catch (error) {
        console.error('Failed to select favorite:', error);
        Alert.alert('Error', 'Failed to load the selected level.');
      }
    },
    [onSelectFavorite, onClose]
  );

  const handleDelete = useCallback((favorite: FavoriteLevel) => {
    Alert.alert(
      'Delete Favorite',
      'Are you sure you want to remove this favorite?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(favorite.levelId);
            try {
              const success = await removeFromFavorites(favorite.levelId);
              if (success) {
                setFavorites((prev) =>
                  prev.filter((f) => f.levelId !== favorite.levelId)
                );
              }
            } catch (error) {
              console.error('Failed to remove favorite:', error);
              Alert.alert('Error', 'Failed to remove favorite. Please try again.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: FavoriteLevel }) => (
      <FavoriteItem
        item={item}
        onPlay={() => handlePlay(item)}
        onDelete={() => handleDelete(item)}
        isDeleting={deletingId === item.levelId}
      />
    ),
    [handlePlay, handleDelete, deletingId]
  );

  const keyExtractor = useCallback((item: FavoriteLevel) => item.levelId, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-gray-900">
        {/* Header */}
        <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-700">
          <Text className="text-white text-xl font-bold">★ Favorites</Text>
          <Pressable onPress={onClose} className="p-2">
            <Text className="text-gray-400 text-xl">✕</Text>
          </Pressable>
        </View>

        {/* Content */}
        <View className="flex-1 px-4 pt-4">
          {isLoading ? (
            <LoadingView />
          ) : favorites.length === 0 ? (
            <EmptyFavoritesView />
          ) : (
            <FlatList
              data={favorites}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
