import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Link } from "expo-router";
import { trpc } from "@/lib/trpc/client";
import { TESTGAMES } from "@/lib/registry/generated/testGames";
import type { GameDefinition } from "@slopcade/shared";

interface GameItem {
  id: string;
  title: string;
  description: string | null;
  playCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function MakerScreen() {
  const router = useRouter();
  const [myGames, setMyGames] = useState<GameItem[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // New Game modal state
  const [showNewGameModal, setShowNewGameModal] = useState(false);

  // AI Generation state
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedGame, setGeneratedGame] = useState<GameDefinition | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const fetchGames = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoadingGames(true);

    try {
      const result = await trpc.games.listByInstall.query();
      setMyGames(result);
    } catch {
      setMyGames([]);
    } finally {
      setIsLoadingGames(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || prompt.length < 5) {
      setGenerateError("Please enter a longer description (at least 5 characters)");
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);
    setGeneratedGame(null);

    try {
      const result = await trpc.games.generate.mutate({
        prompt: prompt.trim(),
        saveToLibrary: false,
      });
      setGeneratedGame(result.game);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate game";
      setGenerateError(message);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt]);

  const handlePlayPreview = useCallback(() => {
    if (!generatedGame) return;
    setShowNewGameModal(false);
    router.push({
      pathname: "/play/preview",
      params: { definition: JSON.stringify(generatedGame) },
    });
  }, [generatedGame, router]);

  const handleSaveGame = useCallback(async () => {
    if (!generatedGame) return;

    try {
      await trpc.games.create.mutate({
        title: generatedGame.metadata.title,
        description: generatedGame.metadata.description ?? prompt,
        definition: JSON.stringify(generatedGame),
        isPublic: false,
      });

      Alert.alert("Saved!", "Game saved to your projects");
      setGeneratedGame(null);
      setPrompt("");
      setShowNewGameModal(false);
      fetchGames();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save game";
      Alert.alert("Error", message);
    }
  }, [generatedGame, prompt, fetchGames]);

  const handleDeleteGame = useCallback((game: GameItem) => {
    Alert.alert("Delete Game", `Are you sure you want to delete "${game.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await trpc.games.delete.mutate({ id: game.id });
            setMyGames((prev) => prev.filter((g) => g.id !== game.id));
          } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to delete";
            Alert.alert("Error", message);
          }
        },
      },
    ]);
  }, []);

  const handleOpenTemplate = useCallback((templateId: string) => {
    setShowNewGameModal(false);
    router.push({ pathname: "/test-games/[id]", params: { id: templateId } });
  }, [router]);

  const renderProjects = () => (
    <ScrollView
      className="flex-1"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => fetchGames(true)}
          tintColor="#4CAF50"
        />
      }
    >
      <View className="p-4">
        {isLoadingGames ? (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text className="text-gray-400 mt-4">Loading games...</Text>
          </View>
        ) : myGames.length === 0 ? (
          <View className="bg-gray-800 rounded-xl p-8 items-center">
            <Text className="text-5xl mb-4">🎮</Text>
            <Text className="text-xl font-semibold text-white text-center">No games yet</Text>
            <Text className="text-gray-400 text-center mt-2">
              Create a new game or play a template to get started!
            </Text>
            <Pressable
              className="mt-6 py-3 px-6 bg-green-600 rounded-lg"
              onPress={() => setShowNewGameModal(true)}
            >
              <Text className="text-white font-semibold">Create Game</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <Text className="text-gray-400 mb-4">
              {myGames.length} game{myGames.length !== 1 ? "s" : ""} - Long press to delete
            </Text>
            {myGames.map((game) => (
              <Pressable
                key={game.id}
                className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-3 active:bg-gray-700"
                onPress={() => router.push({ pathname: "/play/[id]", params: { id: game.id } })}
                onLongPress={() => handleDeleteGame(game)}
              >
                <Text className="text-lg font-semibold text-white">{game.title}</Text>
                {game.description && (
                  <Text className="text-gray-400 mt-1" numberOfLines={2}>
                    {game.description}
                  </Text>
                )}
                <Text className="text-xs text-gray-500 mt-2">
                  Plays: {game.playCount} - {new Date(game.createdAt).toLocaleDateString()}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderNewGameModal = () => (
    <Modal
      visible={showNewGameModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowNewGameModal(false)}
    >
      <SafeAreaView className="flex-1 bg-gray-900">
        <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-700">
          <Text className="text-xl font-bold text-white">Create New Game</Text>
          <Pressable onPress={() => setShowNewGameModal(false)}>
            <Text className="text-gray-400 text-lg">✕</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          <View className="p-4">
            {/* AI Generation Section */}
            <View className="mb-8">
              <Text className="text-lg font-semibold text-white mb-3">
                Generate with AI
              </Text>
              <Text className="text-gray-400 mb-3">
                Describe the game you want to create:
              </Text>

              <TextInput
                className="bg-gray-800 p-4 rounded-xl border border-gray-700 text-base min-h-[100px] text-white"
                placeholder="E.g., A game where I launch balls at towers..."
                placeholderTextColor="#666"
                value={prompt}
                onChangeText={setPrompt}
                multiline
                textAlignVertical="top"
                editable={!isGenerating}
              />

              <Pressable
                className={`mt-4 py-4 rounded-xl items-center ${
                  isGenerating ? "bg-gray-600" : "bg-green-600 active:bg-green-700"
                }`}
                onPress={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator color="white" size="small" />
                    <Text className="text-white font-bold text-lg ml-2">Generating...</Text>
                  </View>
                ) : (
                  <Text className="text-white font-bold text-lg">Generate Game</Text>
                )}
              </Pressable>

              {generateError && (
                <View className="mt-4 p-4 bg-red-900/50 rounded-xl border border-red-700">
                  <Text className="text-red-300">{generateError}</Text>
                </View>
              )}

              {generatedGame && (
                <View className="mt-6 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <View className="p-4 bg-green-900/30 border-b border-gray-700">
                    <Text className="text-lg font-bold text-white">
                      {generatedGame.metadata.title}
                    </Text>
                    <Text className="text-gray-300 mt-1">
                      {generatedGame.metadata.description}
                    </Text>
                  </View>

                  <View className="p-4 flex-row">
                    <Pressable
                      className="flex-1 py-3 bg-blue-600 rounded-lg items-center mr-2 active:bg-blue-700"
                      onPress={handlePlayPreview}
                    >
                      <Text className="text-white font-semibold">Play</Text>
                    </Pressable>
                    <Pressable
                      className="flex-1 py-3 bg-green-600 rounded-lg items-center ml-2 active:bg-green-700"
                      onPress={handleSaveGame}
                    >
                      <Text className="text-white font-semibold">Save</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>

            {/* Templates Section */}
            <View>
              <Text className="text-lg font-semibold text-white mb-3">
                Start from Template
              </Text>
              <Text className="text-gray-400 mb-3">
                Choose a template to get started:
              </Text>

              {TESTGAMES.map((game) => (
                <Pressable
                  key={game.id}
                  className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-3 active:bg-gray-700"
                  onPress={() => handleOpenTemplate(game.id)}
                >
                  <View className="flex-row items-center">
                    <Text className="text-2xl mr-3">🎮</Text>
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-white">
                        {game.meta.title}
                      </Text>
                      {game.meta.description && (
                        <Text className="text-gray-400 mt-1" numberOfLines={2}>
                          {game.meta.description}
                        </Text>
                      )}
                    </View>
                    <Text className="text-gray-500">→</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-900" edges={["bottom"]}>
      <View className="px-4 py-3 flex-row justify-between items-center">
        <Text className="text-xl font-bold text-white">Game Maker</Text>
        <Pressable
          className="py-2 px-4 bg-green-600 rounded-lg active:bg-green-700"
          onPress={() => setShowNewGameModal(true)}
        >
          <Text className="text-white font-semibold">+ New Game</Text>
        </Pressable>
      </View>

      {renderProjects()}
      {renderNewGameModal()}
    </SafeAreaView>
  );
}
