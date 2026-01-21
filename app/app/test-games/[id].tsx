import { useMemo, useState, useCallback } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WithSkia } from "@/components/WithSkia";
import { getTestGame } from "@/lib/test-games/demoGames";

export default function TestGameRunScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useMemo(() => (id ? getTestGame(id) : undefined), [id]);

  const [runtimeKey, setRuntimeKey] = useState(0);

  const handleBack = useCallback(() => router.back(), [router]);
  const handleReset = useCallback(() => setRuntimeKey((k) => k + 1), []);

  if (!entry) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center p-6">
        <Text className="text-red-400 text-center text-lg">Unknown test game: {id}</Text>
        <Pressable className="mt-6 py-3 px-6 bg-gray-700 rounded-lg" onPress={handleBack}>
          <Text className="text-white font-semibold">← Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView className="absolute top-0 left-0 right-0 z-10" edges={["top"]}>
        <View className="flex-row items-center justify-between px-4 py-2">
          <Pressable className="py-2 px-4 bg-black/50 rounded-lg" onPress={handleBack}>
            <Text className="text-white font-semibold">← Back</Text>
          </Pressable>
          <Text className="text-white font-bold text-lg flex-1 text-center" numberOfLines={1}>
            {entry.title}
          </Text>
          <Pressable className="py-2 px-4 bg-black/50 rounded-lg" onPress={handleReset}>
            <Text className="text-white font-semibold">Reset</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <WithSkia
        getComponent={() =>
          import("@/lib/game-engine/GameRuntime.native").then((mod) => ({
            default: () => (
              <mod.GameRuntime
                key={runtimeKey}
                definition={entry.definition}
                showHUD={false}
              />
            ),
          }))
        }
        fallback={
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#4CAF50" />
          </View>
        }
      />
    </View>
  );
}
