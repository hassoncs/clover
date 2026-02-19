import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	Modal,
	Pressable,
	RefreshControl,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GameGridCard } from "@/components/browse/GameCard";
import { useBrowsePartyGames } from "@/hooks/useBrowsePartyGames";
import { createPartyRoom } from "@/lib/party/api";

export default function BrowseScreen() {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState("");
	const [launching, setLaunching] = useState<string | null>(null);
	const [launchError, setLaunchError] = useState<string | null>(null);

	const { templates, isLoading, refetch } = useBrowsePartyGames();

	type Template = (typeof templates)[number];

	const filtered = searchQuery.trim()
		? templates.filter(
				(t: Template) =>
					t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
					(t.description ?? "")
						.toLowerCase()
						.includes(searchQuery.toLowerCase()),
			)
		: templates;

	const handlePlay = async (
		templateId: string,
		templateTitle: string,
		minPlayers: number,
	) => {
		try {
			setLaunching(templateTitle);
			setLaunchError(null);
			const { code, hostToken } = await createPartyRoom(templateId, minPlayers);
			router.push({
				pathname: "/party/host",
				params: {
					code,
					hostToken,
					templateId,
					templateTitle,
					minPlayers: String(minPlayers),
				},
			});
		} catch (err) {
			setLaunchError(
				err instanceof Error ? err.message : "Failed to create room",
			);
		} finally {
			setLaunching(null);
		}
	};

	return (
		<SafeAreaView className="flex-1 bg-theme-background" edges={["bottom"]}>
			<Modal transparent animationType="fade" visible={!!launching}>
				<View className="flex-1 bg-black/60 items-center justify-center">
					<View className="bg-theme-surface rounded-2xl p-8 items-center gap-4 mx-8">
						<ActivityIndicator
							size="large"
							color="rgb(var(--color-theme-primary))"
						/>
						<Text className="text-theme-text font-semibold text-lg text-center">
							Starting {launching}…
						</Text>
						<Text className="text-theme-text-secondary text-sm text-center">
							Setting up your room
						</Text>
					</View>
				</View>
			</Modal>

			<ScrollView
				className="flex-1"
				refreshControl={
					<RefreshControl
						refreshing={false}
						onRefresh={() => refetch()}
						tintColor="rgb(var(--color-theme-primary))"
					/>
				}
			>
				<View className="p-4">
					<View className="mb-4 flex-row justify-between items-start">
						<View>
							<Text className="text-2xl font-bold text-theme-text">Games</Text>
							<Text className="text-theme-text-secondary mt-1">
								Tap a game to host it for your group
							</Text>
						</View>
						<Pressable
							onPress={() => router.push("/settings/game-settings")}
							className="p-2 -mr-2"
							accessibilityLabel="Settings"
						>
							<Ionicons name="settings-outline" size={24} color="#C9A84C" />
						</Pressable>
					</View>

					<Pressable
						className="mb-4 bg-theme-surface py-3 rounded-xl items-center active:opacity-80 border border-theme-border"
						onPress={() => router.push("/join")}
					>
						<Text className="text-theme-text font-bold text-base">
							Join a Party →
						</Text>
					</Pressable>

					{launchError && (
						<View className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
							<Text className="text-red-400 text-center text-sm">
								{launchError}
							</Text>
							<Pressable onPress={() => setLaunchError(null)} className="mt-1">
								<Text className="text-red-400 text-center text-xs underline">
									Dismiss
								</Text>
							</Pressable>
						</View>
					)}

					<View className="mb-4">
						<View className="flex-row items-center bg-theme-surface rounded-xl px-4 py-3 border border-theme-border">
							<Text className="text-theme-text-secondary mr-3">🔍</Text>
							<TextInput
								className="flex-1 text-theme-text text-base"
								placeholder="Search games..."
								placeholderTextColor="rgb(var(--color-theme-text-tertiary))"
								value={searchQuery}
								onChangeText={setSearchQuery}
								autoCapitalize="none"
								autoCorrect={false}
								accessibilityLabel="Search games"
							/>
							{searchQuery.length > 0 && (
								<Pressable
									onPress={() => setSearchQuery("")}
									accessibilityRole="button"
									accessibilityLabel="Clear search"
								>
									<Text className="text-theme-text-secondary text-lg">✕</Text>
								</Pressable>
							)}
						</View>
					</View>

					<View className="mb-6">
						<View className="flex-row items-center justify-between mb-3">
							<Text className="text-lg font-semibold text-theme-text">
								{searchQuery.trim() ? "Results" : "All Games"}
							</Text>
							{!isLoading && filtered.length > 0 && (
								<Text className="text-theme-text-secondary text-sm">
									{filtered.length} {filtered.length === 1 ? "game" : "games"}
								</Text>
							)}
						</View>

						{isLoading ? (
							<View className="items-center py-12">
								<ActivityIndicator
									size="large"
									color="rgb(var(--color-theme-primary))"
								/>
								<Text className="text-theme-text-secondary mt-4">
									Loading games...
								</Text>
							</View>
						) : filtered.length === 0 ? (
							<View className="p-6 bg-theme-surface rounded-xl border border-theme-border items-center">
								<Text className="text-4xl mb-3">🎮</Text>
								<Text className="text-theme-text-secondary text-center">
									{searchQuery
										? "No games match your search."
										: "No games available yet."}
								</Text>
								{searchQuery && (
									<Pressable
										onPress={() => setSearchQuery("")}
										className="mt-3"
									>
										<Text className="text-theme-primary font-medium">
											Clear search
										</Text>
									</Pressable>
								)}
							</View>
						) : (
							<View className="flex-row flex-wrap justify-between">
								{filtered.map((template: Template) => (
									<GameGridCard
										key={template.id}
										title={template.title}
										thumbnailEmoji={template.emoji}
										thumbnailBgClass="bg-theme-primary/10"
										players={`${template.minPlayers}-${template.maxPlayers}`}
										onPress={() =>
											handlePlay(
												template.id,
												template.title,
												template.minPlayers,
											)
										}
									/>
								))}
							</View>
						)}
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}
