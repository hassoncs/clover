import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc/client";
import type { GameDefinition } from "@clover/shared";
import { WithSkia } from "../../components/WithSkia";

export default function PlayScreen() {
  const router = useRouter();
  const { id, definition: definitionParam } = useLocalSearchParams<{
    id: string;
    definition?: string;
  }>();
  
  const [gameDefinition, setGameDefinition] = useState<GameDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGame = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (definitionParam) {
          const parsed = JSON.parse(definitionParam) as GameDefinition;
          setGameDefinition(parsed);
        } else if (id && id !== "preview") {
          const game = await trpc.games.get.query({ id });
          const parsed = JSON.parse(game.definition) as GameDefinition;
          setGameDefinition(parsed);

          await trpc.games.incrementPlayCount.mutate({ id });
        } else {
          throw new Error("No game definition provided");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load game";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadGame();
  }, [id, definitionParam]);

  const handleGameEnd = useCallback((state: "won" | "lost") => {
    console.log(`Game ended: ${state}`);
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text className="text-white mt-4">Loading game...</Text>
      </SafeAreaView>
    );
  }

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
          <Text className="text-white font-bold text-lg" numberOfLines={1}>
            {gameDefinition.metadata.title}
          </Text>
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
