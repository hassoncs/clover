import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, FlatList, Pressable, View } from "react-native";
import { TESTGAMES } from "@/lib/registry/generated/testGames";

export default function TestGamesTab() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-gray-900" edges={["top", "bottom"]}>
      <View className="px-4 py-3 border-b border-gray-700">
        <Text className="text-2xl font-bold text-white">Test Games</Text>
        <Text className="text-gray-400 mt-1">
          {TESTGAMES.length} playable games with win/lose conditions
        </Text>
      </View>
      <FlatList
        data={TESTGAMES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <Pressable
            className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-3 active:bg-gray-700"
            onPress={() =>
              router.push({ pathname: "/test-games/[id]", params: { id: item.id } })
            }
          >
            <Text className="text-lg font-semibold text-white">{item.meta.title}</Text>
            {item.meta.description && (
              <Text className="text-gray-400 mt-1">{item.meta.description}</Text>
            )}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
