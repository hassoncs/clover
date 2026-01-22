import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc/client";
import type { GameDefinition } from "@slopcade/shared";

const EXAMPLE_PROMPTS = [
  "A game where I launch balls at targets",
  "A platformer where a cat collects fish",
  "A stacking game where I drop blocks",
  "A game where I catch falling fruit",
  "A racing game over hills",
];

export default function CreateScreen() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedGame, setGeneratedGame] = useState<GameDefinition | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || prompt.length < 5) {
      setError("Please enter a longer description (at least 5 characters)");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedGame(null);

    try {
      const result = await trpc.games.generate.mutate({
        prompt: prompt.trim(),
        saveToLibrary: false,
      });

      setGeneratedGame(result.game);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate game";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt]);

  const handlePlayPreview = useCallback(() => {
    if (!generatedGame) return;
    
    router.push({
      pathname: "/play/preview",
      params: { definition: JSON.stringify(generatedGame) },
    });
  }, [generatedGame, router]);

  const handleSave = useCallback(async () => {
    if (!generatedGame) return;

    try {
      await trpc.games.create.mutate({
        title: generatedGame.metadata.title,
        description: generatedGame.metadata.description ?? prompt,
        definition: JSON.stringify(generatedGame),
        isPublic: false,
      });

      Alert.alert("Saved!", "Game saved to your library", [
        {
          text: "View Library",
          onPress: () => router.push("/(tabs)/library"),
        },
        { text: "Create Another", style: "cancel" },
      ]);

      setGeneratedGame(null);
      setPrompt("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save game";
      Alert.alert("Error", message);
    }
  }, [generatedGame, prompt, router]);

  const handleExamplePrompt = useCallback((example: string) => {
    setPrompt(example);
    setError(null);
    setGeneratedGame(null);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          <View className="p-6">
            <Text className="text-lg text-gray-700 mb-4">
              Describe the game you want to create:
            </Text>

            <TextInput
              className="bg-white p-4 rounded-xl border border-gray-200 text-base min-h-[100px] text-gray-800"
              placeholder="E.g., A game where I launch balls at towers..."
              placeholderTextColor="#999"
              value={prompt}
              onChangeText={setPrompt}
              multiline
              textAlignVertical="top"
              editable={!isGenerating}
            />

            <Pressable
              className={`mt-4 py-4 rounded-xl items-center ${
                isGenerating ? "bg-gray-400" : "bg-green-500 active:bg-green-600"
              }`}
              onPress={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="white" size="small" />
                  <Text className="text-white font-bold text-lg ml-2">
                    Generating...
                  </Text>
                </View>
              ) : (
                <Text className="text-white font-bold text-lg">
                  ✨ Generate Game
                </Text>
              )}
            </Pressable>

            {error && (
              <View className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200">
                <Text className="text-red-600">{error}</Text>
              </View>
            )}

            {generatedGame && (
              <View className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
                <View className="p-4 bg-green-50 border-b border-gray-200">
                  <Text className="text-lg font-bold text-gray-800">
                    {generatedGame.metadata.title}
                  </Text>
                  <Text className="text-gray-600 mt-1">
                    {generatedGame.metadata.description}
                  </Text>
                </View>

                <View className="p-4 flex-row">
                  <Pressable
                    className="flex-1 py-3 bg-blue-500 rounded-lg items-center mr-2 active:bg-blue-600"
                    onPress={handlePlayPreview}
                  >
                    <Text className="text-white font-semibold">▶ Play</Text>
                  </Pressable>
                  <Pressable
                    className="flex-1 py-3 bg-green-500 rounded-lg items-center ml-2 active:bg-green-600"
                    onPress={handleSave}
                  >
                    <Text className="text-white font-semibold">💾 Save</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <View className="mt-8">
              <Text className="text-sm text-gray-500 mb-3 uppercase tracking-wide">
                Try an example:
              </Text>
              {EXAMPLE_PROMPTS.map((example) => (
                <Pressable
                  key={example}
                  className="py-3 px-4 bg-white rounded-lg border border-gray-200 mb-2 active:bg-gray-100"
                  onPress={() => handleExamplePrompt(example)}
                >
                  <Text className="text-gray-700">{example}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
