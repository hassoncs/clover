import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { GameDefinition } from "@slopcade/shared";
import { WithGodot } from "../../components/WithGodot";
import { FullScreenHeader } from "../../components/FullScreenHeader";



export default function PreviewScreen() {
  const router = useRouter();
  const { definition: definitionParam } = useLocalSearchParams<{
    definition: string;
  }>();
  
  const [gameDefinition, setGameDefinition] = useState<GameDefinition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runtimeKey, setRuntimeKey] = useState(0);

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

  const handleRequestRestart = useCallback(() => {
    setRuntimeKey((k) => k + 1);
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
      <FullScreenHeader
        onBack={handleBack}
        centerContent={
          <View className="bg-yellow-500/80 px-3 py-1 rounded-full">
            <Text className="text-yellow-900 font-semibold text-sm">PREVIEW</Text>
          </View>
        }
      />

      <WithGodot
        key={runtimeKey}
        getComponent={() =>
          import("@/lib/game-engine/GameRuntime.godot").then((mod) => ({
            default: () => (
              <mod.GameRuntimeGodot
                definition={gameDefinition}
                onGameEnd={handleGameEnd}
                onRequestRestart={handleRequestRestart}
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
