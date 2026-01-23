import { View, Text, Pressable, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TESTGAMES } from "@/lib/registry/generated/testGames";
import { trpc } from "@/lib/trpc/client";
import { useState, useEffect, useCallback } from "react";

interface PublicGame {
  id: string;
  title: string;
  description: string | null;
  playCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  userId: string | null;
  definition: string;
  thumbnailUrl: string | null;
  isPublic: boolean;
}

export default function BrowseScreen() {
  const router = useRouter();
  const [publicGames, setPublicGames] = useState<PublicGame[]>([]);
  const [isLoadingPublic, setIsLoadingPublic] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPublicGames = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoadingPublic(true);

    try {
      const result = await trpc.games.listPublic.query({ limit: 20, offset: 0 });
      setPublicGames(result);
    } catch (err) {
      console.error("Failed to load public games:", err);
      setPublicGames([]);
    } finally {
      setIsLoadingPublic(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPublicGames();
  }, [fetchPublicGames]);

  return (
    <SafeAreaView className="flex-1 bg-gray-900" edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchPublicGames(true)}
            tintColor="#4CAF50"
          />
        }
      >
        <View className="p-4">
          <View className="mb-6">
            <Text className="text-2xl font-bold text-white">Browse Games</Text>
            <Text className="text-gray-400 mt-1">
              Discover and play amazing physics-based games
            </Text>
          </View>

          {/* Template Games Section */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-white mb-3">Template Games</Text>
            <Text className="text-gray-400 mb-4">
              {TESTGAMES.length} playable demos with win/lose conditions
            </Text>

            {TESTGAMES.map((game) => (
              <Pressable
                key={game.id}
                className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-3 active:bg-gray-700"
                onPress={() => router.push({ pathname: "/game-detail/[id]", params: { id: game.id, source: "template" } })}
              >
                <View className="flex-row items-center">
                  <View className="w-16 h-16 bg-indigo-900/30 rounded-lg items-center justify-center mr-4">
                    <Text className="text-3xl">🎮</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-white">{game.meta.title}</Text>
                    {game.meta.description && (
                      <Text className="text-gray-400 mt-1" numberOfLines={2}>
                        {game.meta.description}
                      </Text>
                    )}
                  </View>
                  <Text className="text-gray-500 text-xl">→</Text>
                </View>
              </Pressable>
            ))}
          </View>

          {/* Community Games Section */}
          <View>
            <Text className="text-lg font-semibold text-white mb-3">Community Games</Text>
            
            {isLoadingPublic ? (
              <View className="items-center py-12">
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text className="text-gray-400 mt-4">Loading community games...</Text>
              </View>
            ) : publicGames.length === 0 ? (
              <View className="p-4 bg-gray-800 rounded-xl border border-gray-700">
                <Text className="text-gray-400">
                  No public games yet. Be the first to publish a game!
                </Text>
              </View>
            ) : (
              <>
                <Text className="text-gray-400 mb-4">
                  {publicGames.length} public {publicGames.length === 1 ? 'game' : 'games'}
                </Text>
                {publicGames.map((game) => (
                  <Pressable
                    key={game.id}
                    className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-3 active:bg-gray-700"
                    onPress={() => router.push({ pathname: "/game-detail/[id]", params: { id: game.id, source: "database" } })}
                  >
                    <View className="flex-row items-center">
                      <View className="w-16 h-16 bg-green-900/30 rounded-lg items-center justify-center mr-4">
                        <Text className="text-3xl">🌟</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-lg font-semibold text-white">{game.title}</Text>
                        {game.description && (
                          <Text className="text-gray-400 mt-1" numberOfLines={2}>
                            {game.description}
                          </Text>
                        )}
                        <Text className="text-xs text-gray-500 mt-2">
                          Plays: {game.playCount} • {new Date(game.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text className="text-gray-500 text-xl">→</Text>
                    </View>
                  </Pressable>
                ))}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
