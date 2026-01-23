import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator, TextInput, Modal, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc/client";
import type { GameDefinition, AssetPack } from "@slopcade/shared";
import { WithGodot } from "../../components/WithGodot";
import { FullScreenHeader } from "../../components/FullScreenHeader";
import { EntityAssetList, ParallaxAssetPanel } from "../../components/assets";

export default function PlayScreen() {
  const router = useRouter();
  const { id, definition: definitionParam } = useLocalSearchParams<{
    id: string;
    definition?: string;
  }>();
  
  const [gameDefinition, setGameDefinition] = useState<GameDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runtimeKey, setRuntimeKey] = useState(0);
  const [showAssetMenu, setShowAssetMenu] = useState(false);
  const [genPrompt, setGenPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<'pixel' | 'cartoon' | '3d' | 'flat'>('pixel');
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingTemplateId, setRegeneratingTemplateId] = useState<string | undefined>(undefined);
  const [generatingLayer, setGeneratingLayer] = useState<'sky' | 'far' | 'mid' | 'near' | 'all' | undefined>(undefined);
  const [activeAssetPackId, setActiveAssetPackId] = useState<string | undefined>(undefined);
  const [isForking, setIsForking] = useState(false);

  useEffect(() => {
    const loadGame = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (definitionParam) {
          const parsed = JSON.parse(definitionParam) as GameDefinition;
          setGameDefinition(parsed);
          setActiveAssetPackId(parsed.activeAssetPackId);
        } else if (id && id !== "preview") {
          const game = await trpc.games.get.query({ id });
          const parsed = JSON.parse(game.definition) as GameDefinition;
          setGameDefinition(parsed);
          setActiveAssetPackId(parsed.activeAssetPackId);

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

  const handleRequestRestart = useCallback(() => {
    setRuntimeKey((k) => k + 1);
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleFork = useCallback(async () => {
    if (!id || id === "preview") return;
    
    setIsForking(true);
    try {
      const result = await trpc.games.fork.mutate({ id });
      router.replace(`/editor/${result.id}`);
    } catch (err) {
      console.error('Failed to fork game:', err);
      setIsForking(false);
    }
  }, [id, router]);



  const generateAssets = async () => {
    if (!id || id === "preview" || !gameDefinition) return;
    
    setIsGenerating(true);
    try {
      const result = await trpc.assets.generateForGame.mutate({
        gameId: id,
        prompt: genPrompt || gameDefinition.metadata.title,
        style: selectedStyle,
      });

      if (result.success && 'assetPack' in result) {
        const successRes = result as { success: true; packId: string; assetPack: AssetPack };
        const newDef = { ...gameDefinition };
        if (!newDef.assetPacks) newDef.assetPacks = {};
        newDef.assetPacks[successRes.packId] = successRes.assetPack;
        newDef.activeAssetPackId = successRes.packId;
        
        setGameDefinition(newDef);
        setActiveAssetPackId(successRes.packId);
        setShowAssetMenu(false);
      }
    } catch (e) {
      console.error("Asset generation failed", e);
      alert("Failed to generate assets: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateAsset = async (templateId: string) => {
    if (!id || id === "preview" || !gameDefinition || !activeAssetPackId) return;
    
    setRegeneratingTemplateId(templateId);
    try {
      const result = await trpc.assets.regenerateTemplateAsset.mutate({
        gameId: id,
        packId: activeAssetPackId,
        templateId,
        style: selectedStyle,
      });

      if (result.success && result.asset) {
        const newDef = { ...gameDefinition };
        if (newDef.assetPacks?.[activeAssetPackId]) {
          newDef.assetPacks[activeAssetPackId].assets[templateId] = result.asset;
          setGameDefinition(newDef);
        }
      }
    } catch (e) {
      console.error("Asset regeneration failed", e);
      alert("Failed to regenerate asset: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setRegeneratingTemplateId(undefined);
    }
  };

  const handleClearAsset = async (templateId: string) => {
    if (!id || id === "preview" || !gameDefinition || !activeAssetPackId) return;
    
    try {
      await trpc.assets.setTemplateAsset.mutate({
        gameId: id,
        packId: activeAssetPackId,
        templateId,
        source: 'none',
      });

      const newDef = { ...gameDefinition };
      if (newDef.assetPacks?.[activeAssetPackId]) {
        newDef.assetPacks[activeAssetPackId].assets[templateId] = { source: 'none' };
        setGameDefinition(newDef);
      }
    } catch (e) {
      console.error("Clear asset failed", e);
      alert("Failed to clear asset: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleDeletePack = async (packId: string) => {
    if (!id || id === "preview" || !gameDefinition) return;
    
    try {
      await trpc.assets.deletePack.mutate({
        gameId: id,
        packId,
      });

      const newDef = { ...gameDefinition };
      if (newDef.assetPacks) {
        delete newDef.assetPacks[packId];
      }
      if (newDef.activeAssetPackId === packId) {
        newDef.activeAssetPackId = undefined;
      }
      setGameDefinition(newDef);
      if (activeAssetPackId === packId) {
        setActiveAssetPackId(undefined);
      }
    } catch (e) {
      console.error("Delete pack failed", e);
      alert("Failed to delete pack: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleToggleParallax = async (enabled: boolean) => {
    if (!id || id === "preview" || !gameDefinition) return;
    
    try {
      await trpc.assets.updateParallaxConfig.mutate({
        gameId: id,
        enabled,
      });

      const newDef = { ...gameDefinition };
      if (!newDef.parallaxConfig) {
        newDef.parallaxConfig = { enabled, layers: [] };
      } else {
        newDef.parallaxConfig.enabled = enabled;
      }
      setGameDefinition(newDef);
    } catch (e) {
      console.error("Toggle parallax failed", e);
    }
  };

  const handleGenerateLayer = async (depth: 'sky' | 'far' | 'mid' | 'near') => {
    if (!id || id === "preview" || !gameDefinition) return;
    
    setGeneratingLayer(depth);
    try {
      const result = await trpc.assets.generateBackgroundLayer.mutate({
        gameId: id,
        layerId: `${depth}-layer`,
        depth,
        style: selectedStyle,
        promptHints: genPrompt || gameDefinition.metadata.title,
      });

      if (result.success && result.layer) {
        const newDef = { ...gameDefinition };
        if (!newDef.parallaxConfig) {
          newDef.parallaxConfig = { enabled: true, layers: [] };
        }
        const existingIdx = newDef.parallaxConfig.layers?.findIndex(l => l.depth === depth) ?? -1;
        if (existingIdx >= 0 && newDef.parallaxConfig.layers) {
          newDef.parallaxConfig.layers[existingIdx] = result.layer;
        } else {
          newDef.parallaxConfig.layers = [...(newDef.parallaxConfig.layers || []), result.layer];
        }
        setGameDefinition(newDef);
      }
    } catch (e) {
      console.error("Generate layer failed", e);
      alert("Failed to generate layer: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setGeneratingLayer(undefined);
    }
  };

  const handleGenerateAllLayers = async () => {
    if (!id || id === "preview" || !gameDefinition) return;
    
    setGeneratingLayer('all');
    const depths: ('sky' | 'far' | 'mid' | 'near')[] = ['sky', 'far', 'mid', 'near'];
    
    try {
      for (const depth of depths) {
        await handleGenerateLayer(depth);
      }
    } finally {
      setGeneratingLayer(undefined);
    }
  };

  const handleLayerVisibilityChange = async (depth: 'sky' | 'far' | 'mid' | 'near', visible: boolean) => {
    if (!id || id === "preview" || !gameDefinition) return;
    
    const newDef = { ...gameDefinition };
    if (!newDef.parallaxConfig?.layers) return;
    
    const layer = newDef.parallaxConfig.layers.find(l => l.depth === depth);
    if (layer) {
      layer.visible = visible;
      
      try {
        await trpc.assets.updateParallaxConfig.mutate({
          gameId: id,
          layers: newDef.parallaxConfig.layers,
        });
        setGameDefinition(newDef);
      } catch (e) {
        console.error("Update layer visibility failed", e);
      }
    }
  };

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
      <FullScreenHeader
        onBack={handleBack}
        title={gameDefinition.metadata.title}
        rightContent={
          <View className="flex-row gap-2">
            {id && id !== "preview" && (
              <>
                <Pressable
                  className={`py-2 px-3 rounded-lg ${isForking ? 'bg-gray-600' : 'bg-green-600'}`}
                  onPress={handleFork}
                  disabled={isForking}
                >
                  {isForking ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-white font-bold text-xs">✂️ Fork</Text>
                  )}
                </Pressable>
                <Pressable
                  className="py-2 px-3 bg-indigo-600 rounded-lg"
                  onPress={() => setShowAssetMenu(true)}
                >
                  <Text className="text-white font-bold text-xs">🎨 Skin</Text>
                </Pressable>
              </>
            )}
          </View>
        }
      />

      <Modal
        visible={showAssetMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAssetMenu(false)}
      >
        <View className="flex-1 bg-black/80 justify-center items-center p-4">
          <View className="bg-gray-800 w-full max-w-sm rounded-xl p-6">
            <Text className="text-white text-xl font-bold mb-4">Generate Asset Pack</Text>
            
            <Text className="text-gray-400 mb-2">Theme Prompt</Text>
            <TextInput
              className="bg-gray-700 text-white p-3 rounded-lg mb-4"
              placeholder={gameDefinition?.metadata.title || "e.g. Space Station"}
              placeholderTextColor="#666"
              value={genPrompt}
              onChangeText={setGenPrompt}
            />

            <Text className="text-gray-400 mb-2">Art Style</Text>
            <View className="flex-row gap-2 mb-4">
              {(['pixel', 'cartoon', '3d', 'flat'] as const).map(style => (
                <Pressable
                  key={style}
                  className={`flex-1 py-2 rounded-lg items-center ${selectedStyle === style ? 'bg-indigo-600' : 'bg-gray-700'}`}
                  onPress={() => setSelectedStyle(style)}
                >
                  <Text className="text-white text-xs font-medium capitalize">{style}</Text>
                </Pressable>
              ))}
            </View>

            {gameDefinition?.assetPacks && Object.keys(gameDefinition.assetPacks).length > 0 && (
              <View className="mb-4">
                <Text className="text-gray-400 mb-2">Select Existing Pack</Text>
                <ScrollView className="max-h-32">
                  {Object.values(gameDefinition.assetPacks).map(pack => (
                    <View key={pack.id} className="flex-row mb-2">
                      <Pressable
                        className={`flex-1 p-3 rounded-l-lg ${activeAssetPackId === pack.id ? 'bg-green-600' : 'bg-gray-700'}`}
                        onPress={() => setActiveAssetPackId(pack.id)}
                      >
                        <Text className="text-white font-semibold">{pack.name}</Text>
                      </Pressable>
                      <Pressable
                        className="p-3 bg-red-600 rounded-r-lg"
                        onPress={() => handleDeletePack(pack.id)}
                      >
                        <Text className="text-white">Del</Text>
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {activeAssetPackId && gameDefinition?.assetPacks?.[activeAssetPackId] && (
              <View className="mb-4">
                <EntityAssetList
                  gameDefinition={gameDefinition}
                  activePack={gameDefinition.assetPacks[activeAssetPackId]}
                  onRegenerateAsset={handleRegenerateAsset}
                  onClearAsset={handleClearAsset}
                  regeneratingTemplateId={regeneratingTemplateId}
                />
              </View>
            )}

            <ParallaxAssetPanel
              parallaxConfig={gameDefinition?.parallaxConfig}
              onToggleEnabled={handleToggleParallax}
              onGenerateLayer={handleGenerateLayer}
              onGenerateAllLayers={handleGenerateAllLayers}
              onLayerVisibilityChange={handleLayerVisibilityChange}
              generatingLayer={generatingLayer}
              selectedStyle={selectedStyle}
            />

            <View className="flex-row gap-3 mt-4">
              <Pressable
                className="flex-1 py-3 bg-gray-600 rounded-lg items-center"
                onPress={() => setShowAssetMenu(false)}
              >
                <Text className="text-white font-semibold">Cancel</Text>
              </Pressable>
              
              <Pressable
                className={`flex-1 py-3 rounded-lg items-center ${isGenerating ? 'bg-indigo-800' : 'bg-indigo-600'}`}
                onPress={generateAssets}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-white font-semibold">Generate New</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <WithGodot
        key={runtimeKey}
        getComponent={() =>
          import("@/lib/game-engine/GameRuntime.godot").then((mod) => ({
            default: () => (
              <mod.GameRuntimeGodot
                definition={gameDefinition!}
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
