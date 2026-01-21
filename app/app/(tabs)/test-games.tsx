import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, FlatList, Pressable } from "react-native";
import { TEST_GAMES } from "@/lib/test-games/demoGames";

export default function TestGamesTab() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
      <FlatList
        data={TEST_GAMES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <Text className="text-gray-600 mb-4">
            Playable games for testing rendering and physics.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            className="bg-white p-4 rounded-xl border border-gray-200 mb-3 active:bg-gray-100"
            onPress={() =>
              router.push({ pathname: "/test-games/[id]", params: { id: item.id } })
            }
          >
            <Text className="text-lg font-semibold text-gray-800">{item.title}</Text>
            <Text className="text-gray-500 mt-1">{item.description}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
