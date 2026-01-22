import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TESTGAMES } from "@/lib/registry/generated/testGames";

export default function BrowseScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-gray-900" edges={["bottom"]}>
      <ScrollView className="flex-1">
        <View className="p-4">
          <View className="mb-6">
            <Text className="text-2xl font-bold text-white">Browse Games</Text>
            <Text className="text-gray-400 mt-1">
              Discover and play amazing physics-based games
            </Text>
          </View>

          <Text className="text-gray-400 mb-4">
            {TESTGAMES.length} playable demos with win/lose conditions
          </Text>

          {TESTGAMES.map((game) => (
            <Pressable
              key={game.id}
              className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-3 active:bg-gray-700"
              onPress={() => router.push({ pathname: "/test-games/[id]", params: { id: game.id } })}
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

          <View className="mt-8 p-4 bg-gray-800 rounded-xl border border-gray-700">
            <Text className="text-lg font-semibold text-white mb-2">Community Games</Text>
            <Text className="text-gray-400">
              Coming soon! Browse games created by other players and see what's trending.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
