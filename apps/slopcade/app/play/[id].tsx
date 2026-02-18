import type { GameDefinition } from "@slopcade/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	Animated,
	Platform,
	Pressable,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { resolveAssetIds } from "@/lib/assets/resolveAssetIds";
import { useGamePreloader } from "@/lib/hooks/useGamePreloader";
import {
	isGameDownloaded,
	loadLocalGameDefinition,
} from "@/lib/offline/download-manager";
import { getApiUrl, trpc } from "@/lib/trpc/client";
import { FullScreenHeader } from "../../components/FullScreenHeader";
import { AssetLoadingScreen } from "../../components/game";
import { WithGodot } from "../../components/WithGodot";

const loadGameRuntimeModule = () =>
	import("@/lib/game-engine/GameRuntime.godot") as Promise<
		Record<string, unknown>
	>;

export default function PlayScreen() {
	const router = useRouter();
	const {
		id,
		definition: definitionParam,
		debug,
	} = useLocalSearchParams<{
		id: string;
		definition?: string;
		debug?: string;
	}>();
	const isDebugMode = debug === "true";

	const [gameDefinition, setGameDefinition] = useState<GameDefinition | null>(
		null,
	);
	const [isLoadingDefinition, setIsLoadingDefinition] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [runtimeKey, setRuntimeKey] = useState(0);
	const [godotReady, setGodotReady] = useState(false);
	const [loadingDismissed, setLoadingDismissed] = useState(false);
	const loadingOpacity = useRef(new Animated.Value(1)).current;

	const { phase, progress, imageUrls, startPreload, skipPreload, reset } =
		useGamePreloader(gameDefinition);

	useEffect(() => {
		const loadGame = async () => {
			setIsLoadingDefinition(true);
			setError(null);

			try {
				if (definitionParam) {
					let parsed = JSON.parse(definitionParam) as GameDefinition;

					try {
						const apiBase = getApiUrl();
						parsed = await resolveAssetIds(parsed, async (hashes) => {
							const res = await trpc.blobAssets.batchResolve.query({ hashes });
							const urls: Record<string, string> = {};
							for (const [hash, relPath] of Object.entries(res.urls)) {
								urls[hash] = relPath.startsWith("http")
									? relPath
									: `${apiBase}${relPath}`;
							}
							return urls;
						});
					} catch (e) {
						console.warn(
							"[play] Failed to resolve asset IDs from definitionParam",
							e,
						);
					}

					setGameDefinition(parsed);
				} else if (id && id !== "preview") {
					const isDownloaded = await isGameDownloaded(id);

					if (isDownloaded) {
						console.log(
							`[play] Loading game ${id} from local storage (offline)`,
						);
						let localDefinition = await loadLocalGameDefinition(id);
						if (localDefinition) {
							try {
								const apiBase = getApiUrl();
								localDefinition = await resolveAssetIds(
									localDefinition,
									async (hashes) => {
										const res = await trpc.blobAssets.batchResolve.query({
											hashes,
										});
										const urls: Record<string, string> = {};
										for (const [hash, relPath] of Object.entries(res.urls)) {
											urls[hash] = relPath.startsWith("http")
												? relPath
												: `${apiBase}${relPath}`;
										}
										return urls;
									},
								);
							} catch (e) {
								console.warn(
									"[play] Failed to resolve asset IDs for offline game (will use fallback)",
									e,
								);
							}
							setGameDefinition(localDefinition);
						} else {
							throw new Error(
								`Game ${id} is marked as downloaded but definition not found`,
							);
						}
					} else {
						console.log(`[play] Loading game ${id} from API`);
						const game = await trpc.games.getPublic.query({ id });
						let parsed = JSON.parse(game.definition) as GameDefinition;

						try {
							const apiBase = getApiUrl();
							parsed = await resolveAssetIds(parsed, async (hashes) => {
								const res = await trpc.blobAssets.batchResolve.query({
									hashes,
								});
								const urls: Record<string, string> = {};
								for (const [hash, relPath] of Object.entries(res.urls)) {
									urls[hash] = relPath.startsWith("http")
										? relPath
										: `${apiBase}${relPath}`;
								}
								return urls;
							});
						} catch (e) {
							console.warn("[play] Failed to resolve asset IDs from API", e);
						}

						setGameDefinition(parsed);

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
	}, [id, definitionParam]);

	useEffect(() => {
		if (gameDefinition && !isLoadingDefinition && phase === "idle") {
			startPreload();
		}
	}, [gameDefinition, isLoadingDefinition, phase, startPreload]);

	const handleGameEnd = useCallback((state: "won" | "lost") => {
		console.log(`Game ended: ${state}`);
	}, []);

	const handleGodotReady = useCallback(() => {
		setGodotReady(true);
		Animated.timing(loadingOpacity, {
			toValue: 0,
			duration: 500,
			useNativeDriver: Platform.OS !== "web",
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

	const handleBack = useCallback(() => {
		router.back();
	}, [router]);

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

			{canMountGame && (
				<WithGodot
					key={runtimeKey}
					loadModule={loadGameRuntimeModule}
					render={(mod) => {
						const Comp = (
							mod as {
								GameRuntimeGodotWithDevTools: React.ComponentType<
									Record<string, unknown>
								>;
							}
						).GameRuntimeGodotWithDevTools;
						return (
							<Comp
								definition={gameDefinition}
								onGameEnd={handleGameEnd}
								onRequestRestart={handleRequestRestart}
								showHUD
								debugMode={isDebugMode}
								autoStart={isDebugMode}
								preloadTextureUrls={imageUrls}
								onReady={handleGodotReady}
							/>
						);
					}}
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
