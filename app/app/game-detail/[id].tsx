import { Ionicons } from "@expo/vector-icons";
import type { GameDefinition } from "@slopcade/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Image,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DownloadForOfflineButton } from "@/components/DownloadForOfflineButton";
import { GameComments } from "@/components/social/GameComments";
import { LikeButton } from "@/components/social/LikeButton";
import { ReportModal } from "@/components/social/ReportModal";
import { StarRating } from "@/components/social/StarRating";
import { useAuth } from "@/hooks/useAuth";
import {
	isGameDownloaded,
	loadLocalGameDefinition,
} from "@/lib/offline/download-manager";
import { trpc } from "@/lib/trpc/client";

interface GameInfo {
	id: string;
	title: string;
	description: string | null;
	titleHeroImageUrl?: string;
	playCount?: number;
	createdAt?: Date | string;
}

export default function GameDetailScreen() {
	const router = useRouter();
	const { id } = useLocalSearchParams<{ id: string }>();
	const { user } = useAuth();

	const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isForking, setIsForking] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [showReport, setShowReport] = useState(false);
	const [isOffline, setIsOffline] = useState(false);

	const [remixesData, setRemixesData] = useState<
		Array<{
			id: string;
			name: string;
			description: string | null;
			isComplete: boolean;
			thumbnailUrl: string | null;
			style: string | null;
			overrides: {
				variables?: Record<string, unknown>;
				assets?: Record<string, unknown>;
				shaderParams?: Record<string, unknown>;
				sounds?: Record<string, unknown>;
			};
		}>
	>([]);
	const [isLoadingRemixes, setIsLoadingRemixes] = useState(false);

	useEffect(() => {
		if (gameInfo?.id && !isOffline) {
			setIsLoadingRemixes(true);
			trpc.assetSystem.remixes.listRemixes
				.query({ gameId: gameInfo.id })
				.then((data) => {
					setRemixesData(data);
				})
				.catch((err) => {
					console.error("Failed to load remixes:", err);
				})
				.finally(() => {
					setIsLoadingRemixes(false);
				});
		}
	}, [gameInfo?.id, isOffline]);

	// Legacy pack loading removed - packs are deprecated in favor of remixes

	useEffect(() => {
		const loadGameInfo = async () => {
			if (!id) {
				setError("No game ID provided");
				setIsLoading(false);
				return;
			}

			setIsLoading(true);
			setError(null);

			try {
				const downloaded = await isGameDownloaded(id);
				setIsOffline(downloaded);

				if (downloaded) {
					const localDef = await loadLocalGameDefinition(id);
					if (localDef) {
						setGameInfo({
							id,
							title: localDef.metadata.title,
							description: localDef.metadata.description ?? null,
							titleHeroImageUrl: localDef.metadata.titleHeroImageUrl,
						});
					} else {
						throw new Error("Downloaded game not found locally");
					}
				} else {
					const game = await trpc.games.getPublic.query({ id });
					setGameInfo({
						id: game.id,
						title: game.title,
						description: game.description,
						playCount: game.playCount,
						createdAt: game.createdAt,
					});
				}
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "Failed to load game";
				setError(message);
			} finally {
				setIsLoading(false);
			}
		};

		loadGameInfo();
	}, [id]);

	const handleBack = useCallback(() => router.back(), [router]);

	const handlePlay = useCallback(() => {
		if (!gameInfo) return;
		router.push({ pathname: "/play/[id]", params: { id: gameInfo.id } });
	}, [gameInfo, router]);

	const handleFork = useCallback(async () => {
		if (!gameInfo) return;

		setIsForking(true);
		try {
			let definition: GameDefinition;

			if (isOffline) {
				const localDef = await loadLocalGameDefinition(gameInfo.id);
				if (!localDef) throw new Error("Game not found locally");
				definition = localDef;
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
					(err instanceof Error ? err.message : String(err)),
			);
			setIsForking(false);
		}
	}, [gameInfo, router, isOffline]);

	const handleEdit = useCallback(async () => {
		if (!gameInfo) return;

		setIsEditing(true);
		try {
			let definition: GameDefinition;

			if (isOffline) {
				const localDef = await loadLocalGameDefinition(gameInfo.id);
				if (!localDef) throw new Error("Game not found locally");
				definition = localDef;
			} else {
				const game = await trpc.games.get.query({ id: gameInfo.id });
				definition = JSON.parse(game.definition) as GameDefinition;
			}

			router.push({
				pathname: "/editor/[id]",
				params: {
					id: "ephemeral",
					definition: JSON.stringify(definition),
					sourceType: isOffline ? "offline" : "database",
					sourceId: gameInfo.id,
				},
			});
		} catch (err) {
			console.error("Failed to load game for editing:", err);
			Alert.alert(
				"Edit Failed",
				"Could not load the game for editing.\n\n" +
					"Error: " +
					(err instanceof Error ? err.message : String(err)),
			);
		} finally {
			setIsEditing(false);
		}
	}, [gameInfo, router, isOffline]);

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
				<Text className="text-red-400 text-center text-lg">
					{error ?? "Game not found"}
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

	return (
		<SafeAreaView className="flex-1 bg-gray-900">
			<View className="px-4 py-3 flex-row items-center border-b border-gray-800">
				<Pressable onPress={handleBack} className="mr-4">
					<Text className="text-white text-lg">← Back</Text>
				</Pressable>
				<View className="flex-1" />
				{user && (
					<Pressable onPress={() => setShowReport(true)} className="p-2">
						<Ionicons name="flag-outline" size={20} color="#9CA3AF" />
					</Pressable>
				)}
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
							{isOffline ? "OFFLINE" : "COMMUNITY"}
						</Text>
					</View>
				)}

				<View className="px-4 pt-4 pb-8">
					<Text className="text-3xl font-bold text-white mb-2">
						{gameInfo.title}
					</Text>

					<View className="flex-row gap-2 mb-4">
						{isOffline && (
							<View className="bg-green-900/30 px-3 py-1 rounded-full">
								<Text className="text-green-300 text-sm">Offline</Text>
							</View>
						)}
						{gameInfo.playCount !== undefined && (
							<View className="bg-green-900/30 px-3 py-1 rounded-full">
								<Text className="text-green-300 text-sm">
									{gameInfo.playCount} plays
								</Text>
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
							className={`flex-1 py-4 rounded-xl items-center justify-center ${
								isForking ? "bg-gray-600" : "bg-green-600 active:bg-green-700"
							}`}
							onPress={handleFork}
							disabled={isForking}
						>
							{isForking ? (
								<View className="flex-row items-center">
									<ActivityIndicator size="small" color="#FFFFFF" />
									<Text className="text-white font-bold text-base ml-2">
										Forking...
									</Text>
								</View>
							) : (
								<Text className="text-white font-bold text-base">Fork</Text>
							)}
						</Pressable>

						<Pressable
							className={`flex-1 py-4 rounded-xl items-center justify-center ${
								isEditing ? "bg-gray-600" : "bg-purple-600 active:bg-purple-700"
							}`}
							onPress={handleEdit}
							disabled={isEditing}
						>
							{isEditing ? (
								<View className="flex-row items-center">
									<ActivityIndicator size="small" color="#FFFFFF" />
									<Text className="text-white font-bold text-base ml-2">
										Loading...
									</Text>
								</View>
							) : (
								<Text className="text-white font-bold text-base">Edit</Text>
							)}
						</Pressable>

						{gameInfo && (
							<View className="flex-1 py-2">
								<DownloadForOfflineButton gameId={gameInfo.id} size="md" />
							</View>
						)}

						<Pressable
							className="flex-[2] py-4 bg-blue-600 rounded-xl items-center justify-center active:bg-blue-700"
							onPress={handlePlay}
						>
							<Text className="text-white font-bold text-lg">Play</Text>
						</Pressable>
					</View>

					<View className="flex-row items-center gap-6 mb-6">
						<LikeButton
							gameId={gameInfo.id}
							likeCount={0}
							currentUserId={user?.id ?? null}
						/>
						<StarRating gameId={gameInfo.id} currentUserId={user?.id ?? null} />
					</View>

					<View className="mb-8 bg-gray-800/50 rounded-xl overflow-hidden">
						<GameComments
							gameId={gameInfo.id}
							currentUserId={user?.id ?? null}
						/>
					</View>

					{!isOffline && (
						<View>
							{isLoadingRemixes ? (
								<ActivityIndicator color="#4CAF50" />
							) : remixesData && remixesData.length > 0 ? (
								<View>
									<Text className="text-white text-xl font-bold mb-4">
										Remixes
									</Text>
									<View className="gap-3">
										{remixesData.map((remix) => {
											const overrideTypes = [];
											if (remix.overrides.assets) overrideTypes.push("assets");
											if (remix.overrides.variables)
												overrideTypes.push("variables");
											if (remix.overrides.sounds) overrideTypes.push("sounds");
											if (remix.overrides.shaderParams)
												overrideTypes.push("shaders");

											return (
												<Pressable
													key={remix.id}
													className="bg-gray-800 p-4 rounded-xl flex-row items-center justify-between active:bg-gray-700"
													onPress={() =>
														router.push({
															pathname: "/play/[id]",
															params: { id: gameInfo.id, remixId: remix.id },
														})
													}
												>
													<View className="flex-row items-center flex-1 mr-4">
														{remix.thumbnailUrl && (
															<Image
																source={{ uri: remix.thumbnailUrl }}
																className="w-12 h-12 rounded-lg mr-3 bg-gray-700"
															/>
														)}
														<View className="flex-1">
															<View className="flex-row items-center gap-2 mb-1 flex-wrap">
																<Text
																	className="text-white font-semibold text-lg"
																	numberOfLines={1}
																>
																	{remix.name}
																</Text>
																{remix.isComplete && (
																	<View className="bg-green-900/50 px-2 py-0.5 rounded">
																		<Text className="text-green-400 text-[10px] font-bold">
																			COMPLETE
																		</Text>
																	</View>
																)}
																{remix.style && (
																	<View className="bg-purple-900/50 px-2 py-0.5 rounded">
																		<Text className="text-purple-300 text-[10px] font-bold uppercase">
																			{remix.style}
																		</Text>
																	</View>
																)}
															</View>
															<Text
																className="text-gray-400 text-sm mb-1"
																numberOfLines={2}
															>
																{remix.description || "No description"}
															</Text>
															{overrideTypes.length > 0 && (
																<Text className="text-gray-500 text-xs">
																	Includes: {overrideTypes.join(" + ")}
																</Text>
															)}
														</View>
													</View>
													<View className="bg-blue-600/20 p-2 rounded-full">
														<Text className="text-blue-400 font-bold text-xs">
															PLAY
														</Text>
													</View>
												</Pressable>
											);
										})}
									</View>
								</View>
							) : (
								<View>
									<Text className="text-white text-xl font-bold mb-4">
										Remixes
									</Text>
									<View className="bg-gray-800/50 p-6 rounded-xl items-center">
										<Text className="text-gray-400 mb-3 text-center">
											No remixes created for this game yet.
										</Text>
										<Pressable
											onPress={() => router.push(`/editor/${gameInfo.id}`)}
											className="bg-gray-700 px-4 py-2 rounded-lg"
										>
											<Text className="text-white font-semibold">
												Open Editor to Create Remix
											</Text>
										</Pressable>
									</View>
								</View>
							)}
						</View>
					)}
				</View>
			</ScrollView>

			<ReportModal
				visible={showReport}
				targetType="game"
				targetId={gameInfo.id}
				onClose={() => setShowReport(false)}
			/>
		</SafeAreaView>
	);
}
