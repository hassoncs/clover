import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc/client";
import type { GameDefinition } from "@slopcade/shared";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  EditorProvider,
  EditorTopBar,
  BottomDock,
  StageContainer,
  BottomSheetHost,
} from "@/components/editor";

export default function EditorScreen() {
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

  const handleBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text className="text-white mt-4">Loading editor...</Text>
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-gray-900">
        <EditorProvider gameId={id ?? "preview"} initialDefinition={gameDefinition}>
          <EditorTopBar />
          <StageContainer />
          <BottomDock />
          <BottomSheetHost />
        </EditorProvider>
      </View>
    </GestureHandlerRootView>
  );
}
