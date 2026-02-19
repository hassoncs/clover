import { useRouter } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
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

export default function BrowseScreen() {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState("");

	const { templates, isLoading, refetch } = useBrowsePartyGames();

	const filtered = searchQuery.trim()
		? templates.filter(
				(t) =>
					t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
					(t.description ?? "")
						.toLowerCase()
						.includes(searchQuery.toLowerCase()),
			)
		: templates;

	return (
		<SafeAreaView className="flex-1 bg-theme-background" edges={["bottom"]}>
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
					<View className="mb-4">
						<Text className="text-2xl font-bold text-theme-text">Games</Text>
						<Text className="text-theme-text-secondary mt-1">
							Choose a game for your group
						</Text>
					</View>

					<Pressable
						className="mb-4 bg-theme-primary py-3 rounded-xl items-center active:opacity-80"
						onPress={() => router.push("/party/join")}
					>
						<Text className="text-theme-text-inverse font-bold text-base">
							Join a Party
						</Text>
					</Pressable>

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
									{filtered.length}{" "}
									{filtered.length === 1 ? "game" : "games"}
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
								{filtered.map((template) => (
									<GameGridCard
										key={template.id}
										title={template.title}
										thumbnailEmoji={template.emoji}
										thumbnailBgClass="bg-theme-primary/10"
										players={`${template.minPlayers}-${template.maxPlayers}`}
										onPress={() =>
											router.push({
												pathname: "/game-detail/[id]",
												params: { id: template.id },
											})
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
