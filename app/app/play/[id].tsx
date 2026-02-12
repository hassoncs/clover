import type { GameDefinition } from "@slopcade/shared";
import type { GameVariableValue } from "@slopcade/shared/types/GameDefinition";
import { applyVariableOverrides } from "@slopcade/shared/types/remix";
import { STYLE_PRESET_OPTIONS } from "@slopcade/shared/types/style-presets";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	Animated,
	Modal,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ResolvedPackEntry } from "@/lib/assets";
import { mergeAssetsIntoPrefabs } from "@/lib/assets/mergeAssetsIntoTemplates";
import { useGamePreloader } from "@/lib/hooks/useGamePreloader";
import {
	getLocalResolvedPackEntries,
	isGameDownloaded,
	loadLocalGameDefinition,
} from "@/lib/offline/download-manager";
import { trpc } from "@/lib/trpc/client";
import { EntityAssetList, ParallaxAssetPanel } from "../../components/assets";
import { FullScreenHeader } from "../../components/FullScreenHeader";
import { AssetLoadingScreen } from "../../components/game";
import { WithGodot } from "../../components/WithGodot";

export default function PlayScreen() {
	const router = useRouter();
	const {
		id,
		definition: definitionParam,
		packId,
		remixId,
	} = useLocalSearchParams<{
		id: string;
		definition?: string;
		packId?: string;
		remixId?: string;
	}>();

	const [gameDefinition, setGameDefinition] = useState<GameDefinition | null>(
		null,
	);
	const [isLoadingDefinition, setIsLoadingDefinition] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [runtimeKey, setRuntimeKey] = useState(0);
	const [showAssetMenu, setShowAssetMenu] = useState(false);
	const [genPrompt, setGenPrompt] = useState("");
	const [selectedStyle, setSelectedStyle] = useState<string>("pixel");
	const [isGenerating, setIsGenerating] = useState(false);
	const [regeneratingPrefabId, setRegeneratingPrefabId] = useState<
		string | undefined
	>(undefined);
	const [generatingLayer, setGeneratingLayer] = useState<
		"sky" | "far" | "mid" | "near" | "all" | undefined
	>(undefined);
	const [activeAssetPackId, setActiveAssetPackId] = useState<
		string | undefined
	>(undefined);
	const [isForking, setIsForking] = useState(false);

	const [remixVariableOverrides, setRemixVariableOverrides] = useState<
		Record<string, GameVariableValue> | undefined
	>(undefined);
	const [isLoadingRemix, setIsLoadingRemix] = useState(false);

	const [resolvedPackEntries, setResolvedPackEntries] = useState<
		Record<string, ResolvedPackEntry> | undefined
	>(undefined);
	const [availablePacks, setAvailablePacks] = useState<
		{ id: string; name: string; isComplete: boolean }[]
	>([]);
	const [availableRemixes, setAvailableRemixes] = useState<
		{ id: string; name: string; isComplete: boolean }[]
	>([]);
	const [isLoadingPack, setIsLoadingPack] = useState(false);
	const [godotReady, setGodotReady] = useState(false);
	const [loadingDismissed, setLoadingDismissed] = useState(false);
	const loadingOpacity = useRef(new Animated.Value(1)).current;

	const enrichedDefinition = useMemo(() => {
		if (!gameDefinition) return null;
		console.log("[play] Merging assets into game definition...", {
			hasAssets: !!resolvedPackEntries,
			assetCount: resolvedPackEntries
				? Object.keys(resolvedPackEntries).length
				: 0,
			hasVariableOverrides: !!remixVariableOverrides,
		});

		let def = gameDefinition;

		if (remixVariableOverrides && def.variables) {
			def = {
				...def,
				variables: applyVariableOverrides(
					def.variables,
					remixVariableOverrides,
				),
			};
		}

		return mergeAssetsIntoPrefabs(def, resolvedPackEntries);
	}, [gameDefinition, resolvedPackEntries, remixVariableOverrides]);

	const { phase, progress, imageUrls, startPreload, skipPreload, reset } =
		useGamePreloader(enrichedDefinition, {
			resolvedPackEntries,
		});

	useEffect(() => {
		if (id && id !== "preview") {
			trpc.assetSystem.getCompatiblePacks
				.query({ gameId: id })
				.then((result) => {
					setAvailablePacks(result.packs);
				})
				.catch((err) =>
					console.error("Failed to fetch compatible packs:", err),
				);

			trpc.assetSystem.remixes.listRemixes
				.query({ gameId: id })
				.then((result) => {
					setAvailableRemixes(
						result.map((r) => ({
							id: r.id,
							name: r.name,
							isComplete: r.isComplete,
						})),
					);
				})
				.catch((err) => console.error("Failed to fetch remixes:", err));
		}
	}, [id]);

	useEffect(() => {
		if (!remixId || !id || id === "preview") {
			setRemixVariableOverrides(undefined);
			return;
		}

		let cancelled = false;
		setIsLoadingRemix(true);

		trpc.assetSystem.remixes.getResolvedRemix
			.query({ gameId: id, remixId })
			.then((result) => {
				if (cancelled) return;

				if (result.overrides.variables) {
					setRemixVariableOverrides(result.overrides.variables);
				}

				const entries: Record<string, ResolvedPackEntry> = {};
				for (const [prefabId, entry] of Object.entries(
					result.entriesByPrefabId,
				)) {
					if (entry.imageUrl) {
						entries[prefabId] = {
							imageUrl: entry.imageUrl,
							placement: entry.placement
								? {
										scale: entry.placement.scale ?? 1,
										offsetX: entry.placement.offsetX ?? 0,
										offsetY: entry.placement.offsetY ?? 0,
									}
								: undefined,
						};
					}
				}
				if (Object.keys(entries).length > 0) {
					setResolvedPackEntries(entries);
				}
			})
			.catch((err) => {
				if (cancelled) return;
				console.error("[play] Failed to load remix:", err);
			})
			.finally(() => {
				if (!cancelled) {
					setIsLoadingRemix(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [id, remixId]);

	useEffect(() => {
		if (remixId) return;

		const effectivePackId = packId || activeAssetPackId;

		const loadPack = async () => {
			if (!id || id === "preview" || !effectivePackId) {
				setResolvedPackEntries(undefined);
				return;
			}

			setIsLoadingPack(true);
			try {
				const isDownloaded = await isGameDownloaded(id);

				if (isDownloaded) {
					const localEntries = await getLocalResolvedPackEntries(
						id,
						effectivePackId,
					);
					if (localEntries) {
						setResolvedPackEntries(localEntries);
						setActiveAssetPackId(effectivePackId);
					} else {
						console.warn(
							`[play] Pack ${effectivePackId} not found locally, falling back to API`,
						);
						await loadPackFromApi(id, effectivePackId);
					}
				} else {
					await loadPackFromApi(id, effectivePackId);
				}
			} catch (err) {
				console.error("Failed to load asset pack:", err);
				setResolvedPackEntries(undefined);
			} finally {
				setIsLoadingPack(false);
			}
		};

		const loadPackFromApi = async (gameId: string, pid: string) => {
			const result = await trpc.assetSystem.getResolvedForGame.query({
				gameId,
				packId: pid,
			});

			const entries: Record<string, ResolvedPackEntry> = {};
			Object.entries(result.entriesByPrefabId).forEach(([prefabId, entry]) => {
				if (entry.imageUrl) {
					entries[prefabId] = {
						imageUrl: entry.imageUrl,
						placement: entry.placement || undefined,
					};
				}
			});

			setResolvedPackEntries(entries);
			setActiveAssetPackId(pid);
		};

		loadPack();
	}, [id, packId, activeAssetPackId, remixId]);

	useEffect(() => {
		const loadGame = async () => {
			setIsLoadingDefinition(true);
			setError(null);

			try {
				if (definitionParam) {
					const parsed = JSON.parse(definitionParam) as GameDefinition;
					setGameDefinition(parsed);
					if (!packId) {
						setActiveAssetPackId(parsed.assetSystem?.activePackId);
					}
				} else if (id && id !== "preview") {
					const isDownloaded = await isGameDownloaded(id);

					if (isDownloaded) {
						console.log(
							`[play] Loading game ${id} from local storage (offline)`,
						);
						const localDefinition = await loadLocalGameDefinition(id);
						if (localDefinition) {
							setGameDefinition(localDefinition);
							if (!packId) {
								setActiveAssetPackId(localDefinition.assetSystem?.activePackId);
							}
						} else {
							throw new Error(
								`Game ${id} is marked as downloaded but definition not found`,
							);
						}
					} else {
						console.log(`[play] Loading game ${id} from API`);
						const game = await trpc.games.getPublic.query({ id });
						const parsed = JSON.parse(game.definition) as GameDefinition;
						setGameDefinition(parsed);
						if (!packId) {
							setActiveAssetPackId(parsed.assetSystem?.activePackId);
						}

						await trpc.games.incrementPlayCount.mutate({ id });
					}
				} else {
					throw new Error("No game definition provided");
				}
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "Failed to load game";
				setError(message);
			} finally {
				setIsLoadingDefinition(false);
			}
		};

		loadGame();
	}, [id, definitionParam, packId]);

	useEffect(() => {
		if (
			gameDefinition &&
			!isLoadingDefinition &&
			!isLoadingPack &&
			!isLoadingRemix &&
			phase === "idle"
		) {
			startPreload();
		}
	}, [
		gameDefinition,
		isLoadingDefinition,
		isLoadingPack,
		isLoadingRemix,
		phase,
		startPreload,
	]);

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

	const handleRemixSelect = (
		itemId: string,
		type: "pack" | "remix" = "pack",
	) => {
		if (type === "pack" && itemId === activeAssetPackId) return;
		if (type === "remix" && itemId === remixId) return;

		const params: any = { id: id! };
		if (type === "remix") {
			params.remixId = itemId;
		} else {
			params.packId = itemId;
		}

		router.replace({
			pathname: "/play/[id]",
			params,
		});

		reset();
		setRuntimeKey((k) => k + 1);
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
			console.error("Failed to fork game:", err);
			setIsForking(false);
		}
	}, [id, router]);

	const generateAssets = async () => {
		if (!id || id === "preview" || !gameDefinition) return;

		setIsGenerating(true);
		try {
			const result = await trpc.assetSystem.applyThemeToGame.mutate({
				gameId: id,
				newTheme: {
					name: genPrompt || gameDefinition.metadata.title,
					promptModifier: genPrompt || gameDefinition.metadata.title,
				},
				setAsActive: true,
			});

			if (result.jobId) {
				// Refresh available packs and select the new one
				const packsResult = await trpc.assetSystem.getCompatiblePacks.query({
					gameId: id,
				});
				setAvailablePacks(packsResult.packs);
				handleRemixSelect(result.packId, "pack");
			}
		} catch (e) {
			console.error("Asset generation failed", e);
			alert(
				"Failed to generate assets: " +
					(e instanceof Error ? e.message : String(e)),
			);
		} finally {
			setIsGenerating(false);
		}
	};

	const handleRegenerateAsset = async (prefabId: string) => {
		if (!id || id === "preview" || !gameDefinition || !activeAssetPackId)
			return;

		setRegeneratingPrefabId(prefabId);
		try {
			const result = await trpc.assetSystem.regenerateAssets.mutate({
				packId: activeAssetPackId,
				prefabIds: [prefabId],
				newStyle: selectedStyle,
			});

			if (result.jobId) {
				const pack = await trpc.assetSystem.getPack.query({
					id: activeAssetPackId,
				});
				if (pack?.entries) {
					const entries: Record<string, ResolvedPackEntry> = {};
					pack.entries.forEach((entry) => {
						if (entry.imageUrl) {
							entries[entry.prefabId] = {
								imageUrl: entry.imageUrl,
								placement: entry.placement,
							};
						}
					});
					setResolvedPackEntries(entries);
				}
			}
		} catch (e) {
			console.error("Asset regeneration failed", e);
			alert(
				"Failed to regenerate asset: " +
					(e instanceof Error ? e.message : String(e)),
			);
		} finally {
			setRegeneratingPrefabId(undefined);
		}
	};

	const handleClearAsset = async (prefabId: string) => {
		if (!id || id === "preview" || !gameDefinition || !activeAssetPackId)
			return;

		try {
			await trpc.assetSystem.removePackEntry.mutate({
				packId: activeAssetPackId,
				prefabId,
			});

			setResolvedPackEntries((prev) => {
				if (!prev) return prev;
				const updated = { ...prev };
				delete updated[prefabId];
				return updated;
			});
		} catch (e) {
			console.error("Clear asset failed", e);
			alert(
				"Failed to clear asset: " +
					(e instanceof Error ? e.message : String(e)),
			);
		}
	};

	const handleDeletePack = async (packId: string) => {
		if (!id || id === "preview" || !gameDefinition) return;

		try {
			await trpc.assetSystem.deletePack.mutate({ id: packId });

			setAvailablePacks((prev) => prev.filter((p) => p.id !== packId));
			if (activeAssetPackId === packId) {
				setActiveAssetPackId(undefined);
				setResolvedPackEntries(undefined);
			}
		} catch (e) {
			console.error("Delete pack failed", e);
			alert(
				"Failed to delete pack: " +
					(e instanceof Error ? e.message : String(e)),
			);
		}
	};

	const handleToggleParallax = async (enabled: boolean) => {
		if (!id || id === "preview" || !gameDefinition) return;

		try {
			// Note: trpc.assets.updateParallaxConfig removed in V3
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

	const handleGenerateLayer = async (depth: "sky" | "far" | "mid" | "near") => {
		if (!id || id === "preview" || !gameDefinition) return;

		setGeneratingLayer(depth);
		try {
			// Note: trpc.assets.generateBackgroundLayer removed in V3
			alert("Background layer generation is not yet supported in V3");
		} catch (e) {
			console.error("Generate layer failed", e);
			alert(
				"Failed to generate layer: " +
					(e instanceof Error ? e.message : String(e)),
			);
		} finally {
			setGeneratingLayer(undefined);
		}
	};

	const handleGenerateAllLayers = async () => {
		if (!id || id === "preview" || !gameDefinition) return;

		setGeneratingLayer("all");
		const depths: ("sky" | "far" | "mid" | "near")[] = [
			"sky",
			"far",
			"mid",
			"near",
		];

		try {
			for (const depth of depths) {
				await handleGenerateLayer(depth);
			}
		} finally {
			setGeneratingLayer(undefined);
		}
	};

	const handleLayerVisibilityChange = async (
		depth: "sky" | "far" | "mid" | "near",
		visible: boolean,
	) => {
		if (!id || id === "preview" || !gameDefinition) return;

		const newDef = { ...gameDefinition };
		if (!newDef.parallaxConfig?.layers) return;

		const layer = newDef.parallaxConfig.layers.find((l) => l.depth === depth);
		if (layer) {
			layer.visible = visible;

			try {
				// Note: trpc.assets.updateParallaxConfig removed in V3
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
				<Text className="text-red-400 text-center text-lg">
					{error ?? "No game found"}
				</Text>
				<Pressable
					className="mt-6 py-3 px-6 bg-gray-700 rounded-lg"
					onPress={handleBack}
				>
					<Text className="text-white font-semibold">← Go Back</Text>
				</Pressable>
			</SafeAreaView>
		);
	}

	const canMountGame = phase === "ready" || phase === "skipped";
	const showLoadingOverlay = !loadingDismissed;

	return (
		<View className="flex-1 bg-gray-900">
			<FullScreenHeader onBack={handleBack} />

			<Modal
				visible={showAssetMenu}
				transparent={true}
				animationType="slide"
				onRequestClose={() => setShowAssetMenu(false)}
			>
				<View className="flex-1 bg-black/80 justify-center items-center p-4">
					<View className="bg-gray-800 w-full max-w-sm rounded-xl p-6">
						<Text className="text-white text-xl font-bold mb-4">
							Generate Remix
						</Text>

						{id && id !== "preview" && (
							<Pressable
								className={`mb-4 py-2 rounded-lg items-center ${isForking ? "bg-gray-600" : "bg-green-600"}`}
								onPress={handleFork}
								disabled={isForking}
							>
								{isForking ? (
									<View className="flex-row items-center">
										<ActivityIndicator size="small" color="#FFFFFF" />
										<Text className="text-white font-semibold ml-2">
											Forking...
										</Text>
									</View>
								) : (
									<Text className="text-white font-semibold">✂️ Fork Game</Text>
								)}
							</Pressable>
						)}

						{(availablePacks.length > 0 || availableRemixes.length > 0) && (
							<View className="mb-6">
								<Text className="text-gray-400 mb-2">Select Remix</Text>
								<ScrollView
									horizontal
									showsHorizontalScrollIndicator={false}
									className="flex-row gap-2"
								>
									{availableRemixes.map((remix) => (
										<Pressable
											key={remix.id}
											className={`p-3 rounded-lg mr-2 border ${
												remixId === remix.id
													? "bg-indigo-600 border-indigo-400"
													: "bg-gray-700 border-gray-600"
											} ${!remix.isComplete ? "opacity-50" : ""}`}
											onPress={() => handleRemixSelect(remix.id, "remix")}
										>
											<Text className="text-white font-semibold">
												{remix.name}
											</Text>
											{!remix.isComplete && (
												<Text className="text-xs text-yellow-400 mt-1">
													Generating...
												</Text>
											)}
										</Pressable>
									))}
									{availablePacks.map((pack) => (
										<Pressable
											key={pack.id}
											className={`p-3 rounded-lg mr-2 border ${
												activeAssetPackId === pack.id
													? "bg-indigo-600 border-indigo-400"
													: "bg-gray-700 border-gray-600"
											} ${!pack.isComplete ? "opacity-50" : ""}`}
											onPress={() => handleRemixSelect(pack.id, "pack")}
										>
											<Text className="text-white font-semibold">
												{pack.name}
											</Text>
											{!pack.isComplete && (
												<Text className="text-xs text-yellow-400 mt-1">
													Generating...
												</Text>
											)}
										</Pressable>
									))}
								</ScrollView>
							</View>
						)}

						<Text className="text-gray-400 mb-2">Remix Prompt</Text>
						<TextInput
							className="bg-gray-700 text-white p-3 rounded-lg mb-4"
							placeholder={
								gameDefinition?.metadata.title || "e.g. Space Station"
							}
							placeholderTextColor="#666"
							value={genPrompt}
							onChangeText={setGenPrompt}
						/>

						<Text className="text-gray-400 mb-2">Art Style</Text>
						<View className="flex-row flex-wrap gap-2 mb-4">
							{STYLE_PRESET_OPTIONS.map((style) => (
								<Pressable
									key={style.id}
									className={`py-2 px-3 rounded-lg items-center ${selectedStyle === style.id ? "bg-indigo-600" : "bg-gray-700"}`}
									onPress={() => setSelectedStyle(style.id)}
								>
									<Text className="text-white text-xs font-medium capitalize">
										{style.emoji} {style.label}
									</Text>
								</Pressable>
							))}
							<Pressable
								className={`py-2 px-3 rounded-lg items-center ${!STYLE_PRESET_OPTIONS.some((s) => s.id === selectedStyle) ? "bg-indigo-600" : "bg-gray-700"}`}
								onPress={() => {
									if (
										STYLE_PRESET_OPTIONS.some((s) => s.id === selectedStyle)
									) {
										setSelectedStyle("");
									}
								}}
							>
								<Text className="text-white text-xs font-medium capitalize">
									✨ Custom
								</Text>
							</Pressable>
						</View>
						{!STYLE_PRESET_OPTIONS.some((s) => s.id === selectedStyle) && (
							<TextInput
								className="bg-gray-700 text-white p-3 rounded-lg mb-4"
								placeholder="e.g. Cyberpunk Neon"
								placeholderTextColor="#666"
								value={selectedStyle}
								onChangeText={setSelectedStyle}
							/>
						)}

						{activeAssetPackId && (
							<View className="mb-4">
								<EntityAssetList
									gameDefinition={gameDefinition}
									assets={resolvedPackEntries || null}
									onRegenerateAsset={handleRegenerateAsset}
									onClearAsset={handleClearAsset}
									regeneratingPrefabId={regeneratingPrefabId}
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
								className={`flex-1 py-3 rounded-lg items-center ${isGenerating ? "bg-indigo-800" : "bg-indigo-600"}`}
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
									definition={enrichedDefinition!}
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
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						zIndex: 20,
						opacity: loadingOpacity,
					}}
					pointerEvents={godotReady ? "none" : "auto"}
				>
					<AssetLoadingScreen
						gameTitle={gameDefinition.metadata.title}
						progress={progress}
						config={gameDefinition.loadingScreen}
						titleHeroImageUrl={gameDefinition.metadata.titleHeroImageUrl}
						instructions={gameDefinition.metadata.instructions}
						onSkip={godotReady ? undefined : skipPreload}
					/>
				</Animated.View>
			)}
		</View>
	);
}
