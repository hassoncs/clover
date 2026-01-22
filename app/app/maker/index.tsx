import { View, Text, Pressable, ScrollView, Image } from "react-native";
import { Link, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc/client";
import { useEffect, useState } from "react";
import type { ClientGame } from "@slopcade/shared";
import { TESTGAMES, type TestGameId } from "@/lib/registry/generated/testGames";

export default function MakerDashboard() {
  const router = useRouter();
  const [myGames, setMyGames] = useState<ClientGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView className="flex-1 px-4">
          
          <View className="flex-row justify-between items-center py-6">
            <Text className="text-3xl font-bold text-white">Game Maker</Text>
            <Link href="/(tabs)/maker" asChild>
              <Pressable className="bg-green-600 px-4 py-2 rounded-lg">
                <Text className="text-white font-bold">+ New Game</Text>
              </Pressable>
            </Link>
          </View>

          <View className="mb-8">
            <Text className="text-xl font-bold text-white mb-4">My Projects</Text>
            {isLoading ? (
              <Text className="text-gray-400">Loading...</Text>
            ) : myGames.length > 0 ? (
              <View className="flex-row flex-wrap gap-4">
                {myGames.map((game) => (
                  <Pressable 
                    key={game.id}
                    className="w-[48%] bg-gray-800 rounded-xl overflow-hidden mb-4"
                    onPress={() => router.push(`/editor/${game.id}`)}
                  >
                    <View className="h-32 bg-gray-700 items-center justify-center">
                      <Text className="text-4xl">🎮</Text>
                    </View>
                    <View className="p-3">
                      <Text className="text-white font-bold" numberOfLines={1}>{game.title}</Text>
                      <Text className="text-gray-400 text-xs" numberOfLines={1}>
                        {new Date(game.updatedAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View className="bg-gray-800 rounded-xl p-6 items-center">
                <Text className="text-gray-400 mb-2">No games yet</Text>
                <Text className="text-gray-500 text-center text-sm">
                  Create a new game or fork a template below to get started.
                </Text>
              </View>
            )}
          </View>

          <View className="mb-12">
            <Text className="text-xl font-bold text-white mb-4">Templates & Examples</Text>
            <View className="flex-row flex-wrap gap-4">
              {TESTGAMES.map((game) => (
                <Pressable
                  key={game.id}
                  className="w-[48%] bg-gray-800 rounded-xl overflow-hidden mb-4 border border-gray-700"
                  onPress={() => router.push(`/test-games/${game.id}`)}
                >
                  <View className="h-32 bg-indigo-900/30 items-center justify-center">
                    <Text className="text-4xl">🕹️</Text>
                  </View>
                  <View className="p-3">
                    <Text className="text-white font-bold" numberOfLines={1}>{game.meta.title}</Text>
                    <Text className="text-gray-400 text-xs" numberOfLines={2}>
                      {game.meta.description}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
