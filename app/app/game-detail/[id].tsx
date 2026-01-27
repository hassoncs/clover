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
      </View>

      <ScrollView className="flex-1">
        {gameInfo.titleHeroImageUrl ? (
          <View className="w-full h-48">
            <Image
              source={{ uri: gameInfo.titleHeroImageUrl }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>
        ) : (
          <View className="w-full h-48 bg-gradient-to-br from-indigo-900 to-purple-900 items-center justify-center">
            <Text className="text-3xl font-bold text-white tracking-wider">
              {gameInfo.source === "template" ? "TEMPLATE" : "COMMUNITY"}
            </Text>
          </View>
        )}

        <View className="px-4 pt-4 pb-8">
          <Text className="text-3xl font-bold text-white mb-2">
            {gameInfo.title}
          </Text>

          <View className="flex-row gap-2 mb-4">
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

          {gameInfo.description && (
            <Text className="text-gray-400 text-base mb-4">
              {gameInfo.description}
            </Text>
          )}

          <View className="flex-row gap-3 mb-8">
            <Pressable
              className={`flex-1 py-3 rounded-xl items-center ${
                isForking ? "bg-gray-600" : "bg-green-600 active:bg-green-700"
              }`}
              onPress={handleFork}
              disabled={isForking}
            >
              {isForking ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text className="text-white font-bold text-base ml-2">Forking...</Text>
                </View>
              ) : (
                <Text className="text-white font-bold text-base">Fork</Text>
              )}
            </Pressable>

            <Pressable
              className="flex-[2] py-4 bg-blue-600 rounded-xl items-center active:bg-blue-700"
              onPress={handlePlay}
            >
              <Text className="text-white font-bold text-lg">Play</Text>
            </Pressable>
          </View>

          <View className="mb-8">
            <View className="flex-row items-center mb-4">
              <View className="flex-row mr-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Text key={star} className="text-yellow-400 text-lg">★</Text>
                ))}
              </View>
              <Text className="text-white font-bold text-lg">4.8</Text>
              <Text className="text-gray-400 text-sm ml-2">(2.4K ratings)</Text>
            </View>

            <View className="flex-row flex-wrap gap-2 mb-6">
              {["Arcade", "Casual", "Physics"].map((tag) => (
                <View key={tag} className="bg-gray-800 px-3 py-1 rounded-full">
                  <Text className="text-gray-300 text-sm">{tag}</Text>
                </View>
              ))}
            </View>

            <View className="mb-6">
              <Text className="text-white text-xl font-bold mb-3">About</Text>
              <Text className="text-gray-300 text-base leading-relaxed">
                {gameInfo.description || "Experience an exciting physics-based adventure with stunning visuals and addictive gameplay. Challenge yourself with increasingly difficult levels and compete for the high score!"}
              </Text>
              <Text className="text-gray-300 text-base leading-relaxed mt-3">
                Features intuitive controls, beautiful graphics, and endless replayability. Perfect for quick sessions or extended play. Join thousands of players worldwide!
              </Text>
            </View>

            <View className="flex-row justify-between mb-6 p-4 bg-gray-800/50 rounded-xl">
              <View className="items-center">
                <Text className="text-white font-bold text-lg">#12</Text>
                <Text className="text-gray-400 text-xs">Arcade</Text>
              </View>
              <View className="items-center">
                <Text className="text-white font-bold text-lg">4+</Text>
                <Text className="text-gray-400 text-xs">Age Rating</Text>
              </View>
              <View className="items-center">
                <Text className="text-white font-bold text-lg">1.2.0</Text>
                <Text className="text-gray-400 text-xs">Version</Text>
              </View>
              <View className="items-center">
                <Text className="text-white font-bold text-lg">45MB</Text>
                <Text className="text-gray-400 text-xs">Size</Text>
              </View>
            </View>

            <View>
              <Text className="text-white text-xl font-bold mb-4">Reviews</Text>
              
              <View className="bg-gray-800/50 p-4 rounded-xl mb-3">
                <View className="flex-row items-center mb-2">
                  <View className="w-8 h-8 bg-indigo-600 rounded-full items-center justify-center mr-3">
                    <Text className="text-white font-bold text-sm">JD</Text>
                  </View>
                  <View>
                    <Text className="text-white font-semibold">JohnDoe42</Text>
                    <View className="flex-row">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Text key={star} className="text-yellow-400 text-xs">★</Text>
                      ))}
                    </View>
                  </View>
                  <Text className="text-gray-500 text-xs ml-auto">2 days ago</Text>
                </View>
                <Text className="text-gray-300 text-sm">
                  Absolutely love this game! The physics are so satisfying and the art style is beautiful. Can not stop playing!
                </Text>
              </View>

              <View className="bg-gray-800/50 p-4 rounded-xl mb-3">
                <View className="flex-row items-center mb-2">
                  <View className="w-8 h-8 bg-pink-600 rounded-full items-center justify-center mr-3">
                    <Text className="text-white font-bold text-sm">SG</Text>
                  </View>
                  <View>
                    <Text className="text-white font-semibold">SarahGamer</Text>
                    <View className="flex-row">
                      {[1, 2, 3, 4].map((star) => (
                        <Text key={star} className="text-yellow-400 text-xs">★</Text>
                      ))}
                      <Text className="text-gray-600 text-xs">★</Text>
                    </View>
                  </View>
                  <Text className="text-gray-500 text-xs ml-auto">1 week ago</Text>
                </View>
                <Text className="text-gray-300 text-sm">
                  Great concept and fun gameplay. Would love to see more levels added in future updates!
                </Text>
              </View>

              <View className="bg-gray-800/50 p-4 rounded-xl">
                <View className="flex-row items-center mb-2">
                  <View className="w-8 h-8 bg-green-600 rounded-full items-center justify-center mr-3">
                    <Text className="text-white font-bold text-sm">MX</Text>
                  </View>
                  <View>
                    <Text className="text-white font-semibold">MikeXplorer</Text>
                    <View className="flex-row">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Text key={star} className="text-yellow-400 text-xs">★</Text>
                      ))}
                    </View>
                  </View>
                  <Text className="text-gray-500 text-xs ml-auto">2 weeks ago</Text>
                </View>
                <Text className="text-gray-300 text-sm">
                  Perfect game for short breaks. Smooth controls and no bugs. Highly recommend!
                </Text>
              </View>
            </View>
          </View>

          {gameInfo.source === "database" && (
            <View>
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
                        <Text className="text-blue-400 font-bold text-xs">PLAY</Text>
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
