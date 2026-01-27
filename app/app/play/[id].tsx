import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator, TextInput, Modal, ScrollView, Animated } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc/client";
import type { GameDefinition } from "@slopcade/shared";
import { WithGodot } from "../../components/WithGodot";
import { FullScreenHeader } from "../../components/FullScreenHeader";
import { EntityAssetList, ParallaxAssetPanel } from "../../components/assets";
import { AssetLoadingScreen } from "../../components/game";
import { useGamePreloader } from "@/lib/hooks/useGamePreloader";
import type { ResolvedPackEntry } from "@/lib/assets";

export default function PlayScreen() {
  const router = useRouter();
  const { id, definition: definitionParam, packId } = useLocalSearchParams<{
    id: string;
    definition?: string;
    packId?: string;
  }>();
  
  const [gameDefinition, setGameDefinition] = useState<GameDefinition | null>(null);
  const [isLoadingDefinition, setIsLoadingDefinition] = useState(true);
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

  const [resolvedPackEntries, setResolvedPackEntries] = useState<Record<string, ResolvedPackEntry> | undefined>(undefined);
  const [availablePacks, setAvailablePacks] = useState<{ id: string; name: string; isComplete: boolean }[]>([]);
  const [isLoadingPack, setIsLoadingPack] = useState(false);
  const [godotReady, setGodotReady] = useState(false);
  const [loadingDismissed, setLoadingDismissed] = useState(false);
  const loadingOpacity = useRef(new Animated.Value(1)).current;

  const { phase, progress, imageUrls, startPreload, skipPreload, reset } = useGamePreloader(gameDefinition, {
    resolvedPackEntries,
  });

  useEffect(() => {
    if (id && id !== "preview") {
      trpc.assetSystem.getCompatiblePacks.query({ gameId: id })
        .then(result => {
          setAvailablePacks(result.packs);
        })
        .catch(err => console.error("Failed to fetch compatible packs:", err));
    }
  }, [id]);

  useEffect(() => {
    const loadPack = async () => {
      if (!id || id === "preview" || !packId) {
        setResolvedPackEntries(undefined);
        return;
      }

      setIsLoadingPack(true);
      try {
        const result = await trpc.assetSystem.getResolvedForGame.query({
          gameId: id,
          packId,
        });

        const entries: Record<string, ResolvedPackEntry> = {};
        Object.entries(result.entriesByTemplateId).forEach(([templateId, entry]) => {
          if (entry.imageUrl) {
            entries[templateId] = {
              imageUrl: entry.imageUrl,
              placement: entry.placement || undefined,
            };
          }
        });

        setResolvedPackEntries(entries);
        setActiveAssetPackId(packId);
      } catch (err) {
        console.error("Failed to load asset pack:", err);
        setResolvedPackEntries(undefined);
      } finally {
        setIsLoadingPack(false);
      }
    };

    loadPack();
  }, [id, packId]);

  useEffect(() => {
    const loadGame = async () => {
      setIsLoadingDefinition(true);
      setError(null);

      try {
        if (definitionParam) {
          const parsed = JSON.parse(definitionParam) as GameDefinition;
          setGameDefinition(parsed);
          if (!packId) {
            setActiveAssetPackId(parsed.activeAssetPackId);
          }
        } else if (id && id !== "preview") {
          const game = await trpc.games.get.query({ id });
          const parsed = JSON.parse(game.definition) as GameDefinition;
          setGameDefinition(parsed);
          if (!packId) {
            setActiveAssetPackId(parsed.activeAssetPackId);
          }

          await trpc.games.incrementPlayCount.mutate({ id });
        } else {
          throw new Error("No game definition provided");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load game";
        setError(message);
      } finally {
        setIsLoadingDefinition(false);
      }
    };

    loadGame();
  }, [id, definitionParam, packId]);

  useEffect(() => {
    if (gameDefinition && !isLoadingDefinition && !isLoadingPack && phase === 'idle') {
      startPreload();
    }
  }, [gameDefinition, isLoadingDefinition, isLoadingPack, phase, startPreload]);

  const handleGameEnd = useCallback((state: "won" | "lost") => {
    console.log(`Game ended: ${state}`);
  }, []);

  const handleGodotReady = useCallback(() => {
    setGodotReady(true);
    Animated.timing(loadingOpacity, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setLoadingDismissed(true);
    });
  }, [loadingOpacity]);

  const handleRequestRestart = useCallback(() => {
    reset();
    setGodotReady(false);
    setLoadingDismissed(false);
    loadingOpacity.setValue(1);
    setRuntimeKey((k) => k + 1);
    startPreload();
  }, [reset, startPreload, loadingOpacity]);

  const handlePackSelect = (newPackId: string) => {
    if (newPackId === activeAssetPackId) return;
    
    router.replace({
      pathname: "/play/[id]",
      params: { id: id!, packId: newPackId }
    });
    
    reset();
    setRuntimeKey(k => k + 1);
    setShowAssetMenu(false);
  };

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

      if (result.success && result.generatedAssets.length > 0) {
        const entries: Record<string, ResolvedPackEntry> = {};
        result.generatedAssets.forEach(asset => {
          entries[asset.slotId] = { imageUrl: asset.url };
        });
        setResolvedPackEntries(entries);
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
      const result = await trpc.assetSystem.regenerateAssets.mutate({
        packId: activeAssetPackId,
        templateIds: [templateId],
        newStyle: selectedStyle,
      });

      if (result.jobId) {
        const pack = await trpc.assetSystem.getPack.query({ id: activeAssetPackId });
        if (pack?.entries) {
          const entries: Record<string, ResolvedPackEntry> = {};
          pack.entries.forEach(entry => {
            if (entry.imageUrl) {
              entries[entry.templateId] = { 
                imageUrl: entry.imageUrl, 
                placement: entry.placement 
              };
            }
          });
          setResolvedPackEntries(entries);
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
      await trpc.assetSystem.removePackEntry.mutate({
        packId: activeAssetPackId,
        templateId,
      });

      setResolvedPackEntries(prev => {
        if (!prev) return prev;
        const updated = { ...prev };
        delete updated[templateId];
        return updated;
      });
    } catch (e) {
      console.error("Clear asset failed", e);
      alert("Failed to clear asset: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleDeletePack = async (packId: string) => {
    if (!id || id === "preview" || !gameDefinition) return;
    
    try {
      await trpc.assetSystem.deletePack.mutate({ id: packId });

      setAvailablePacks(prev => prev.filter(p => p.id !== packId));
      if (activeAssetPackId === packId) {
        setActiveAssetPackId(undefined);
        setResolvedPackEntries(undefined);
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

  if (isLoadingDefinition) {
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

  const canMountGame = phase === 'ready' || phase === 'skipped';
  const showLoadingOverlay = !loadingDismissed;

  return (
    <View className="flex-1 bg-gray-900">
      <FullScreenHeader
        onBack={handleBack}
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

            {id && id !== "preview" && (
              <Pressable
                className={`mb-4 py-2 rounded-lg items-center ${isForking ? 'bg-gray-600' : 'bg-green-600'}`}
                onPress={handleFork}
                disabled={isForking}
              >
                {isForking ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text className="text-white font-semibold ml-2">Forking...</Text>
                  </View>
                ) : (
                  <Text className="text-white font-semibold">✂️ Fork Game</Text>
                )}
              </Pressable>
            )}

            {availablePacks.length > 0 && (
              <View className="mb-6">
                <Text className="text-gray-400 mb-2">Select Asset Pack</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                  {availablePacks.map(pack => (
                    <Pressable
                      key={pack.id}
                      className={`p-3 rounded-lg mr-2 border ${
                        activeAssetPackId === pack.id 
                          ? 'bg-indigo-600 border-indigo-400' 
                          : 'bg-gray-700 border-gray-600'
                      } ${!pack.isComplete ? 'opacity-50' : ''}`}
                      onPress={() => handlePackSelect(pack.id)}
                    >
                      <Text className="text-white font-semibold">{pack.name}</Text>
                      {!pack.isComplete && (
                        <Text className="text-xs text-yellow-400 mt-1">Generating...</Text>
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

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

      {canMountGame && (
        <WithGodot
          key={runtimeKey}
          getComponent={() =>
          import("@/lib/game-engine/GameRuntime.godot").then((mod) => ({
            default: () => (
              <mod.GameRuntimeGodotWithDevTools
                  definition={gameDefinition!}
                  onGameEnd={handleGameEnd}
                  onRequestRestart={handleRequestRestart}
                  showHUD
                  preloadTextureUrls={imageUrls}
                  onReady={handleGodotReady}
                />
              ),
            }))
          }
          fallback={null}
        />
      )}

      {showLoadingOverlay && (
        <Animated.View 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 20,
            opacity: loadingOpacity,
          }}
          pointerEvents={godotReady ? 'none' : 'auto'}
        >
          <AssetLoadingScreen
            gameTitle={gameDefinition.metadata.title}
            progress={progress}
            config={gameDefinition.loadingScreen}
            titleHeroImageUrl={gameDefinition.metadata.titleHeroImageUrl}
            onSkip={godotReady ? undefined : skipPreload}
          />
        </Animated.View>
      )}
    </View>
  );
}
