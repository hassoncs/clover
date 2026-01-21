import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc/client";

interface GameItem {
  id: string;
  title: string;
  description: string | null;
  playCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function LibraryScreen() {
  const router = useRouter();
  const [games, setGames] = useState<GameItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const result = await trpc.games.listByInstall.query();
      setGames(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load games";
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const handlePlayGame = useCallback(
    (game: GameItem) => {
      router.push({
        pathname: "/play/[id]",
        params: { id: game.id },
      });
    },
    [router]
  );

  const handleDeleteGame = useCallback(
    (game: GameItem) => {
      Alert.alert("Delete Game", `Are you sure you want to delete "${game.title}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await trpc.games.delete.mutate({ id: game.id });
              setGames((prev) => prev.filter((g) => g.id !== game.id));
            } catch (err) {
              const message = err instanceof Error ? err.message : "Failed to delete";
              Alert.alert("Error", message);
            }
          },
        },
      ]);
    },
    []
  );

  const renderGame = useCallback(
    ({ item }: { item: GameItem }) => (
      <Pressable
        className="bg-white p-4 rounded-xl border border-gray-200 mb-3 active:bg-gray-50"
        onPress={() => handlePlayGame(item)}
        onLongPress={() => handleDeleteGame(item)}
      >
        <Text className="text-lg font-semibold text-gray-800">{item.title}</Text>
        {item.description && (
          <Text className="text-gray-500 mt-1" numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View className="flex-row items-center mt-2">
          <Text className="text-xs text-gray-400">
            Plays: {item.playCount} • Created:{" "}
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </Pressable>
    ),
    [handlePlayGame, handleDeleteGame]
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center" edges={["bottom"]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text className="text-gray-500 mt-4">Loading games...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center p-6" edges={["bottom"]}>
        <Text className="text-red-500 text-center">{error}</Text>
        <Pressable
          className="mt-4 py-3 px-6 bg-green-500 rounded-lg"
          onPress={() => fetchGames()}
        >
          <Text className="text-white font-semibold">Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
      {games.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-6xl mb-4">🎮</Text>
          <Text className="text-xl font-semibold text-gray-700 text-center">
            No games yet
          </Text>
          <Text className="text-gray-500 text-center mt-2">
            Create your first game in the Create tab!
          </Text>
          <Pressable
            className="mt-6 py-3 px-6 bg-green-500 rounded-lg active:bg-green-600"
            onPress={() => router.push("/(tabs)/create")}
          >
            <Text className="text-white font-semibold">✨ Create Game</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={games}
          keyExtractor={(item) => item.id}
          renderItem={renderGame}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchGames(true)}
              tintColor="#4CAF50"
            />
          }
          ListHeaderComponent={
            <Text className="text-sm text-gray-500 mb-3">
              {games.length} game{games.length !== 1 ? "s" : ""} • Long press to delete
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
