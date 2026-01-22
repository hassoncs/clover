import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { GameDefinition } from "@slopcade/shared";
import { WithSkia } from "../../components/WithSkia";

export default function PreviewScreen() {
  const router = useRouter();
  const { definition: definitionParam } = useLocalSearchParams<{
    definition: string;
  }>();
  
  const [gameDefinition, setGameDefinition] = useState<GameDefinition | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (definitionParam) {
      try {
        const parsed = JSON.parse(definitionParam) as GameDefinition;
        setGameDefinition(parsed);
      } catch {
        setError("Invalid game definition");
      }
    } else {
      setError("No game definition provided");
    }
  }, [definitionParam]);

  const handleGameEnd = useCallback((state: "won" | "lost") => {
    console.log(`Game ended: ${state}`);
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  if (error || !gameDefinition) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center p-6">
        <Text className="text-red-400 text-center text-lg">{error ?? "No game found"}</Text>
        <Pressable
          className="mt-6 py-3 px-6 bg-gray-700 rounded-lg"
          onPress={handleBack}
        >
          <Text className="text-white font-semibold">← Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-gray-900">
      <SafeAreaView className="absolute top-0 left-0 right-0 z-10" edges={["top"]}>
        <View className="flex-row items-center justify-between px-4 py-2">
          <Pressable
            className="py-2 px-4 bg-black/50 rounded-lg"
            onPress={handleBack}
          >
            <Text className="text-white font-semibold">← Back</Text>
          </Pressable>
          <View className="bg-yellow-500/80 px-3 py-1 rounded-full">
            <Text className="text-yellow-900 font-semibold text-sm">PREVIEW</Text>
          </View>
          <View className="w-20" />
        </View>
      </SafeAreaView>

      <WithSkia
        getComponent={() =>
          import("@/lib/game-engine/GameRuntime.native").then((mod) => ({
            default: () => (
              <mod.GameRuntime
                definition={gameDefinition}
                onGameEnd={handleGameEnd}
                showHUD
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
