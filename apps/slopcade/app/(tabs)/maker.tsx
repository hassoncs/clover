import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Pressable,
	RefreshControl,
	ScrollView,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "@/lib/toast";
import { trpc } from "@/lib/trpc/client";

interface GameItem {
	id: string;
	title: string;
	description: string | null;
	playCount: number;
	isPublic: boolean;
	createdAt: string;
	updatedAt: string;
}

export default function MakerScreen() {
	const router = useRouter();

	const [myGames, setMyGames] = useState<GameItem[]>([]);
	const [isLoadingGames, setIsLoadingGames] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const fetchGames = useCallback(async (showRefresh = false) => {
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
	}, []);

	useEffect(() => {
		fetchGames();
	}, [fetchGames]);

	const handleDeleteGame = useCallback((game: GameItem) => {
		Alert.alert(
			"Delete Game",
			`Are you sure you want to delete "${game.title}"?`,
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						try {
							await trpc.games.delete.mutate({ id: game.id });
							setMyGames((prev) => prev.filter((g) => g.id !== game.id));
						} catch (err) {
							const message =
								err instanceof Error ? err.message : "Failed to delete";
							toast.error(message);
						}
					},
				},
			],
		);
	}, []);

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
						<Text className="text-xl font-semibold text-white text-center">
							No games yet
						</Text>
						<Text className="text-gray-400 text-center mt-2">
							Create a new game to get started!
						</Text>
					</View>
				) : (
					<View>
						<Text className="text-gray-400 mb-4">
							{myGames.length} game{myGames.length !== 1 ? "s" : ""} - Long
							press to delete
						</Text>
						{myGames.map((game) => (
							<Pressable
								key={game.id}
								className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-3 active:bg-gray-700"
								onPress={() => {
									if (game.isPublic) {
										router.push(`/game-detail/${game.id}`);
									} else {
										router.push(`/editor/${game.id}`);
									}
								}}
								onLongPress={() => handleDeleteGame(game)}
							>
								<View className="flex-row items-center justify-between">
									<View className="flex-1">
										<View className="flex-row items-center gap-2 mb-1">
											<Text className="text-lg font-semibold text-white">
												{game.title}
											</Text>
											<View
												style={{
													paddingHorizontal: 8,
													paddingVertical: 2,
													borderRadius: 4,
													backgroundColor: game.isPublic
														? "rgba(34,197,94,0.15)"
														: "rgba(156,163,175,0.15)",
												}}
											>
												<Text
													style={{
														fontSize: 11,
														fontWeight: "600",
														color: game.isPublic ? "#22C55E" : "#9CA3AF",
													}}
												>
													{game.isPublic ? "Published" : "Draft"}
												</Text>
											</View>
										</View>
										{game.description && (
											<Text className="text-gray-400 mt-1" numberOfLines={2}>
												{game.description}
											</Text>
										)}
										<Text className="text-xs text-gray-500 mt-2">
											{game.playCount} plays ·{" "}
											{new Date(game.createdAt).toLocaleDateString()}
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

	return (
		<SafeAreaView className="flex-1 bg-gray-900" edges={["bottom"]}>
			<View className="px-4 py-3 flex-row justify-between items-center border-b border-gray-800">
				<View>
					<Text className="text-white text-lg font-semibold">Maker</Text>
					<Text className="text-gray-400 text-sm">
						Build and manage your games
					</Text>
				</View>
			</View>

			{renderProjects()}
		</SafeAreaView>
	);
}
