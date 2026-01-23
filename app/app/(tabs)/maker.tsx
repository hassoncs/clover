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
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc/client";
import { TESTGAMES } from "@/lib/registry/generated/testGames";
import { useAuth } from "@/hooks/useAuth";
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
  const { isAuthenticated, isLoading: isAuthLoading, user, signInWithGoogle, sendMagicLink, signOut } = useAuth();
  
  const [myGames, setMyGames] = useState<GameItem[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [showNewGameModal, setShowNewGameModal] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedGame, setGeneratedGame] = useState<GameDefinition | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const fetchGames = useCallback(async (showRefresh = false) => {
    if (!isAuthenticated) {
      setMyGames([]);
      setIsLoadingGames(false);
      return;
    }

    if (showRefresh) setIsRefreshing(true);
    else setIsLoadingGames(true);

    try {
      const result = await trpc.games.list.query();
      setMyGames(result);
    } catch {
      setMyGames([]);
    } finally {
      setIsLoadingGames(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchGames();
    }
  }, [fetchGames, isAuthenticated]);

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

  const handleGoogleSignIn = useCallback(async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to sign in with Google";
      setLoginError(message);
    } finally {
      setIsLoggingIn(false);
    }
  }, [signInWithGoogle]);

  const handleMagicLink = useCallback(async () => {
    if (!loginEmail.trim() || !loginEmail.includes("@")) {
      setLoginError("Please enter a valid email address");
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await sendMagicLink(loginEmail.trim());
      setMagicLinkSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send magic link";
      setLoginError(message);
    } finally {
      setIsLoggingIn(false);
    }
  }, [loginEmail, sendMagicLink]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setMyGames([]);
  }, [signOut]);

  const renderLoginScreen = () => (
    <ScrollView className="flex-1">
      <View className="p-6 items-center">
        <Text className="text-6xl mb-6">🎮</Text>
        <Text className="text-2xl font-bold text-white text-center mb-2">
          Game Maker
        </Text>
        <Text className="text-gray-400 text-center mb-8">
          Sign in to create and save your games
        </Text>

        {magicLinkSent ? (
          <View className="w-full bg-green-900/30 p-6 rounded-xl border border-green-700 mb-6">
            <Text className="text-green-300 text-center text-lg font-semibold mb-2">
              Check your email!
            </Text>
            <Text className="text-green-400 text-center">
              We sent a magic link to {loginEmail}
            </Text>
            <Pressable
              className="mt-4 py-2"
              onPress={() => {
                setMagicLinkSent(false);
                setLoginEmail("");
              }}
            >
              <Text className="text-green-400 text-center underline">
                Use a different email
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View className="w-full mb-6">
              <TextInput
                className="bg-gray-800 p-4 rounded-xl border border-gray-700 text-white text-base mb-3"
                placeholder="Enter your email"
                placeholderTextColor="#666"
                value={loginEmail}
                onChangeText={setLoginEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoggingIn}
              />
              <Pressable
                className={`py-4 rounded-xl items-center ${
                  isLoggingIn ? "bg-gray-600" : "bg-indigo-600 active:bg-indigo-700"
                }`}
                onPress={handleMagicLink}
                disabled={isLoggingIn}
              >
                <Text className="text-white font-semibold text-base">
                  {isLoggingIn ? "Sending..." : "Send Magic Link"}
                </Text>
              </Pressable>
            </View>

            <View className="flex-row items-center w-full mb-6">
              <View className="flex-1 h-px bg-gray-700" />
              <Text className="text-gray-500 px-4">or</Text>
              <View className="flex-1 h-px bg-gray-700" />
            </View>

            <Pressable
              className={`w-full py-4 rounded-xl items-center flex-row justify-center ${
                isLoggingIn ? "bg-gray-600" : "bg-white active:bg-gray-100"
              }`}
              onPress={handleGoogleSignIn}
              disabled={isLoggingIn}
            >
              <Text className="text-gray-800 font-semibold text-base">
                Continue with Google
              </Text>
            </Pressable>
          </>
        )}

        {loginError && (
          <View className="w-full mt-4 p-4 bg-red-900/50 rounded-xl border border-red-700">
            <Text className="text-red-300 text-center">{loginError}</Text>
          </View>
        )}

        <View className="mt-8 p-4 bg-gray-800/50 rounded-xl">
          <Text className="text-gray-400 text-center text-sm">
            You can browse and play public games without signing in.
            Sign in to create, save, and manage your own games.
          </Text>
        </View>
      </View>
    </ScrollView>
  );

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
                onPress={() => router.push({ pathname: "/editor/[id]", params: { id: game.id } })}
                onLongPress={() => handleDeleteGame(game)}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-white">{game.title}</Text>
                    {game.description && (
                      <Text className="text-gray-400 mt-1" numberOfLines={2}>
                        {game.description}
                      </Text>
                    )}
                    <Text className="text-xs text-gray-500 mt-2">
                      {game.playCount} plays · {new Date(game.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text className="text-gray-500 text-lg ml-2">→</Text>
                </View>
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

  if (isAuthLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center" edges={["bottom"]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text className="text-gray-400 mt-4">Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900" edges={["bottom"]}>
        {renderLoginScreen()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-900" edges={["bottom"]}>
      <View className="px-4 py-3 flex-row justify-between items-center border-b border-gray-800">
        <View className="flex-row items-center">
          <Text className="text-gray-400 text-sm">
            {user?.email}
          </Text>
          <Pressable
            className="ml-3 py-1 px-2"
            onPress={handleSignOut}
          >
            <Text className="text-red-400 text-sm">Sign Out</Text>
          </Pressable>
        </View>
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
