import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	Image,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DownloadForOfflineButton } from "@/components/DownloadForOfflineButton";
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

	const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isOffline, setIsOffline] = useState(false);

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
					<Text className="text-white font-semibold">Go Back</Text>
				</Pressable>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView className="flex-1 bg-gray-900">
			<View className="px-4 py-3 flex-row items-center border-b border-gray-800">
				<Pressable onPress={handleBack} className="mr-4">
					<Text className="text-white text-lg">Back</Text>
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
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}
