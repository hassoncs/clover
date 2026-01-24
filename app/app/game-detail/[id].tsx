import { useEffect, useState, useCallback } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { trpc } from "@/lib/trpc/client";
import { TESTGAMES_BY_ID, loadTestGame, type TestGameId } from "@/lib/registry/generated/testGames";
import type { GameDefinition } from "@slopcade/shared";

type GameSource = "template" | "database";

interface GameInfo {
  id: string;
  title: string;
  description: string | null;
  titleHeroImageUrl?: string;
  playCount?: number;
  createdAt?: Date | string;
  source: GameSource;
}

export default function GameDetailScreen() {
  const router = useRouter();
  const { id, source } = useLocalSearchParams<{ id: string; source?: string }>();

  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isForking, setIsForking] = useState(false);

  const [packsData, setPacksData] = useState<{
    packs: {
      id: string;
      name: string;
      description: string | null;
      isComplete: boolean;
      coveredCount: number;
      totalTemplates: number;
    }[];
  } | null>(null);
  const [isLoadingPacks, setIsLoadingPacks] = useState(false);

  useEffect(() => {
    if (gameInfo?.source === "database" && gameInfo.id) {
      setIsLoadingPacks(true);
      trpc.assetSystem.getCompatiblePacks.query({ gameId: gameInfo.id })
        .then((data) => {
          setPacksData(data);
        })
        .catch((err) => {
          console.error("Failed to load packs:", err);
        })
        .finally(() => {
          setIsLoadingPacks(false);
        });
    }
  }, [gameInfo]);

  useEffect(() => {
    const loadGameInfo = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const gameSource: GameSource = source === "database" ? "database" : "template";

        if (gameSource === "template" && id && id in TESTGAMES_BY_ID) {
          const entry = TESTGAMES_BY_ID[id as TestGameId];
          const gameDef = await loadTestGame(id as TestGameId);
          setGameInfo({
            id: entry.id,
            title: entry.meta.title,
            description: entry.meta.description ?? null,
            titleHeroImageUrl: gameDef?.metadata?.titleHeroImageUrl,
            source: "template",
          });
        } else if (gameSource === "database") {
          const game = await trpc.games.get.query({ id: id! });
          setGameInfo({
            id: game.id,
            title: game.title,
            description: game.description,
            playCount: game.playCount,
            createdAt: game.createdAt,
            source: "database",
          });
        } else {
          throw new Error("Game not found");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load game";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) loadGameInfo();
  }, [id, source]);

  const handleBack = useCallback(() => router.back(), [router]);

  const handlePlay = useCallback(() => {
    if (!gameInfo) return;

    if (gameInfo.source === "template") {
      router.push({ pathname: "/test-games/[id]", params: { id: gameInfo.id } });
    } else {
      router.push({ pathname: "/play/[id]", params: { id: gameInfo.id } });
    }
  }, [gameInfo, router]);

  const handleFork = useCallback(async () => {
    if (!gameInfo) return;

    setIsForking(true);
    try {
      if (gameInfo.source === "template") {
        const definition = await loadTestGame(gameInfo.id as TestGameId);
        const result = await trpc.games.create.mutate({
          title: definition.metadata.title,
          description: definition.metadata.description,
          definition: JSON.stringify(definition),
          isPublic: false,
        });
        router.push(`/editor/${result.id}`);
      } else {
        const result = await trpc.games.fork.mutate({ id: gameInfo.id });
        router.push(`/editor/${result.id}`);
      }
    } catch (err) {
      console.error("Failed to fork game:", err);
      Alert.alert(
        "Fork Failed",
        "Could not fork the game. \n\n" +
          "If you are on a physical device, ensure you are on the same Wi-Fi as your computer.\n\n" +
          "Error: " +
          (err instanceof Error ? err.message : String(err))
      );
      setIsForking(false);
    }
  }, [gameInfo, router]);



  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text className="text-white mt-4">Loading game...</Text>
      </SafeAreaView>
    );
  }

  if (error || !gameInfo) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center p-6">
        <Text className="text-red-400 text-center text-lg">{error ?? "Game not found"}</Text>
        <Pressable className="mt-6 py-3 px-6 bg-gray-700 rounded-lg" onPress={handleBack}>
          <Text className="text-white font-semibold">← Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-900">
      <View className="px-4 py-3 flex-row items-center border-b border-gray-800">
        <Pressable onPress={handleBack} className="mr-4">
          <Text className="text-white text-lg">← Back</Text>
        </Pressable>
        <Text className="text-white text-lg font-semibold flex-1" numberOfLines={1}>
          {gameInfo.title}
        </Text>
      </View>

      <ScrollView className="flex-1">
        <View className="p-6">
          <View className="bg-gray-800 rounded-2xl p-6 mb-6">
            {gameInfo.titleHeroImageUrl ? (
              <View className="w-full h-32 rounded-xl overflow-hidden mb-4">
                <Image
                  source={{ uri: gameInfo.titleHeroImageUrl }}
                  className="w-full h-full"
                  resizeMode="contain"
                />
              </View>
            ) : (
              <>
                <View className="w-24 h-24 bg-indigo-900/50 rounded-xl items-center justify-center mx-auto mb-4">
                  <Text className="text-5xl">{gameInfo.source === "template" ? "🎮" : "🌟"}</Text>
                </View>
                <Text className="text-2xl font-bold text-white text-center mb-2">
                  {gameInfo.title}
                </Text>
              </>
            )}

            {gameInfo.description && (
              <Text className="text-gray-400 text-center mb-4">
                {gameInfo.description}
              </Text>
            )}

            <View className="flex-row justify-center gap-4">
              {gameInfo.source === "template" && (
                <View className="bg-indigo-900/30 px-3 py-1 rounded-full">
                  <Text className="text-indigo-300 text-sm">Template</Text>
                </View>
              )}
              {gameInfo.playCount !== undefined && (
                <View className="bg-green-900/30 px-3 py-1 rounded-full">
                  <Text className="text-green-300 text-sm">{gameInfo.playCount} plays</Text>
                </View>
              )}
              {gameInfo.createdAt && (
                <View className="bg-gray-700 px-3 py-1 rounded-full">
                  <Text className="text-gray-300 text-sm">
                    {new Date(gameInfo.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View className="gap-3">
            <Pressable
              className="py-4 bg-blue-600 rounded-xl items-center active:bg-blue-700"
              onPress={handlePlay}
            >
              <Text className="text-white font-bold text-lg">▶️ Play Game</Text>
            </Pressable>

            <Pressable
              className={`py-4 rounded-xl items-center ${
                isForking ? "bg-gray-600" : "bg-green-600 active:bg-green-700"
              }`}
              onPress={handleFork}
              disabled={isForking}
            >
              {isForking ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text className="text-white font-bold text-lg ml-2">Forking...</Text>
                </View>
              ) : (
                <Text className="text-white font-bold text-lg">✂️ Fork to My Games</Text>
              )}
            </Pressable>

          </View>

          <View className="mt-8 p-4 bg-gray-800/50 rounded-xl">
            <Text className="text-gray-400 text-sm text-center">
              <Text className="font-semibold">Fork</Text> copies this game to your library where you can customize assets and edit it.
            </Text>
          </View>

          {gameInfo.source === "database" && (
            <View className="mt-8 mb-8">
              <Text className="text-white text-xl font-bold mb-4">Themes</Text>
              {isLoadingPacks ? (
                <ActivityIndicator color="#4CAF50" />
              ) : packsData?.packs && packsData.packs.length > 0 ? (
                <View className="gap-3">
                  {packsData.packs.map((pack) => (
                    <Pressable
                      key={pack.id}
                      className="bg-gray-800 p-4 rounded-xl flex-row items-center justify-between active:bg-gray-700"
                      onPress={() =>
                        router.push({
                          pathname: "/play/[id]",
                          params: { id: gameInfo.id, packId: pack.id },
                        })
                      }
                    >
                      <View className="flex-1 mr-4">
                        <View className="flex-row items-center gap-2 mb-1">
                          <Text className="text-white font-semibold text-lg" numberOfLines={1}>
                            {pack.name}
                          </Text>
                          {pack.isComplete && (
                            <View className="bg-green-900/50 px-2 py-0.5 rounded text-xs">
                              <Text className="text-green-400 text-xs font-bold">COMPLETE</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-gray-400 text-sm" numberOfLines={2}>
                          {pack.description || "No description"} • {pack.coveredCount}/{pack.totalTemplates} assets
                        </Text>
                      </View>
                      <View className="bg-blue-600/20 p-2 rounded-full">
                        <Text className="text-blue-400 font-bold">▶️</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View className="bg-gray-800/50 p-6 rounded-xl items-center">
                  <Text className="text-gray-400 mb-3 text-center">
                    No custom themes created for this game yet.
                  </Text>
                  <Pressable
                    onPress={() => router.push(`/editor/${gameInfo.id}`)}
                    className="bg-gray-700 px-4 py-2 rounded-lg"
                  >
                    <Text className="text-white font-semibold">Open Editor to Create Theme</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
