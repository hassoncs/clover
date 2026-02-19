import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
	Alert,
	Platform,
	ScrollView,
	Switch,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import {
	type DownloadedGame,
	deleteOfflineGame,
	getDownloadedGames,
} from "@/lib/offline/download-manager";
import { useOfflineMode } from "@/lib/offline/settings";

function formatBytes(bytes: number, decimals = 2) {
	if (!+bytes) return "0 Bytes";
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

export default function OfflineSettingsScreen() {
	const { isOffline, toggleOfflineMode } = useOfflineMode();
	const [games, setGames] = useState<DownloadedGame[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const loadGames = useCallback(async () => {
		if (Platform.OS === "web") {
			setGames([]);
			setIsLoading(false);
			return;
		}
		try {
			const downloaded = await getDownloadedGames();
			setGames(downloaded);
		} catch (error) {
			console.error("Failed to load games:", error);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadGames();
	}, [loadGames]);

	const handleDelete = async (gameId: string) => {
		Alert.alert(
			"Delete Game",
			"Are you sure you want to delete this game from offline storage?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						await deleteOfflineGame(gameId);
						loadGames();
					},
				},
			],
		);
	};

	const handleClearAll = async () => {
		Alert.alert(
			"Clear All Downloads",
			"Are you sure you want to delete ALL downloaded games?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Clear All",
					style: "destructive",
					onPress: async () => {
						for (const game of games) {
							await deleteOfflineGame(game.gameId);
						}
						loadGames();
					},
				},
			],
		);
	};

	const totalSize = games.reduce((acc, game) => acc + game.totalBytes, 0);

	if (Platform.OS === "web") {
		return (
			<View className="flex-1 items-center justify-center p-4">
				<Stack.Screen options={{ title: "Offline Mode" }} />
				<Text className="text-theme-text-secondary text-center">
					Offline mode is not supported on web.
				</Text>
			</View>
		);
	}

	return (
		<ScrollView
			className="flex-1 bg-theme-background"
			contentInsetAdjustmentBehavior="automatic"
		>
			<Stack.Screen options={{ title: "Offline Mode" }} />

			<View className="p-4 gap-6">
				<View className="bg-theme-surface p-4 rounded-xl shadow-sm flex-row items-center justify-between">
					<View className="flex-1 pr-4">
						<Text className="text-base font-semibold text-theme-text">
							Offline Mode
						</Text>
						<Text className="text-sm text-theme-text-secondary mt-1">
							Force the app to use downloaded assets even when online.
						</Text>
					</View>
					<Switch value={isOffline} onValueChange={toggleOfflineMode} />
				</View>

				<View className="bg-theme-surface p-4 rounded-xl shadow-sm">
					<View className="flex-row items-center justify-between mb-4">
						<Text className="text-base font-semibold text-theme-text">
							Storage Used
						</Text>
						<Text className="text-base font-medium text-theme-primary">
							{formatBytes(totalSize)}
						</Text>
					</View>

					{games.length > 0 && (
						<TouchableOpacity
							onPress={handleClearAll}
							className="flex-row items-center justify-center py-2 bg-theme-error/10 rounded-lg"
						>
							<Ionicons name="trash-outline" size={18} color="#EF4444" />
							<Text className="ml-2 text-theme-error font-medium">
								Clear All Downloads
							</Text>
						</TouchableOpacity>
					)}
				</View>

				<View>
					<Text className="text-sm font-medium text-theme-text-secondary mb-2 uppercase tracking-wider ml-1">
						Downloaded Games ({games.length})
					</Text>

					{games.length === 0 ? (
						<View className="bg-theme-surface p-8 rounded-xl shadow-sm items-center justify-center">
							<Ionicons
								name="cloud-offline-outline"
								size={48}
								color="#A89B7D"
							/>
							<Text className="text-theme-text-secondary mt-4 text-center">
								No games downloaded yet.
							</Text>
							<Text className="text-theme-text-tertiary text-sm mt-1 text-center">
								Download games from their details page to play offline.
							</Text>
						</View>
					) : (
						<View className="bg-theme-surface rounded-xl shadow-sm overflow-hidden">
							{games.map((game, index) => (
								<View
									key={game.gameId}
									className={`flex-row items-center p-4 ${index !== games.length - 1 ? "border-b border-theme-border" : ""}`}
								>
									<View className="w-10 h-10 bg-theme-surface-elevated rounded-lg items-center justify-center mr-3">
										<Ionicons
											name="game-controller-outline"
											size={20}
											color="#A89B7D"
										/>
									</View>

									<View className="flex-1">
										<Text
											className="font-medium text-theme-text"
											numberOfLines={1}
										>
											{game.gameId}
										</Text>
										<Text className="text-xs text-theme-text-secondary mt-0.5">
											{formatBytes(game.totalBytes)} • {game.assetCount} assets
										</Text>
									</View>

									<TouchableOpacity
										onPress={() => handleDelete(game.gameId)}
										className="p-2 -mr-2"
									>
										<Ionicons name="trash-outline" size={20} color="#EF4444" />
									</TouchableOpacity>
								</View>
							))}
						</View>
					)}
				</View>
			</View>
		</ScrollView>
	);
}
