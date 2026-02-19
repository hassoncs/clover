import { useRouter } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	RefreshControl,
	ScrollView,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FilterBar } from "@/components/browse/FilterBar";
import { GameGridCard } from "@/components/browse/GameCard";
import { useBrowseGames } from "@/hooks/useBrowseGames";

type SortOption = "newest" | "popular" | "alphabetical" | "rating";

const PAGE_SIZE = 20;

export default function BrowseScreen() {
	const router = useRouter();

	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState<SortOption>("popular");
	const [showFilters, setShowFilters] = useState(false);

	const {
		games,
		isLoading,
		isFetching,
		isRefreshing,
		hasMore,
		loadMore,
		refresh,
	} = useBrowseGames({ pageSize: PAGE_SIZE, searchQuery, sortBy });

	const clearFilters = () => {
		setSortBy("popular");
		setSearchQuery("");
	};

	return (
		<SafeAreaView className="flex-1 bg-theme-background" edges={["bottom"]}>
			<ScrollView
				className="flex-1"
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={refresh}
						tintColor="#C9A84C"
					/>
				}
			>
				<View className="p-4">
					<View className="mb-4">
						<Text className="text-2xl font-bold text-theme-text">
							Browse Games
						</Text>
						<Text className="text-theme-text-secondary mt-1">
							Discover and play physics-based games
						</Text>
					</View>

					<FilterBar
						searchQuery={searchQuery}
						onSearchChange={setSearchQuery}
						sortBy={sortBy}
						onSortByChange={setSortBy}
						showFilters={showFilters}
						onToggleFilters={() => setShowFilters(!showFilters)}
						onClearFilters={clearFilters}
					/>

					<View className="mb-6">
						<View className="flex-row items-center justify-between mb-3">
							<Text className="text-lg font-semibold text-theme-text">
								Games
							</Text>
							{!isLoading && games.length > 0 && (
								<View className="flex-row items-center gap-2">
									{isFetching && (
										<ActivityIndicator size="small" color="#C9A84C" />
									)}
									<Text className="text-theme-text-tertiary text-sm">
										{games.length} {games.length === 1 ? "game" : "games"}
									</Text>
								</View>
							)}
						</View>

						{isLoading ? (
							<View className="items-center py-12">
								<ActivityIndicator size="large" color="#C9A84C" />
								<Text className="text-theme-text-secondary mt-4">
									Loading games...
								</Text>
							</View>
						) : games.length === 0 ? (
							<View className="p-6 bg-theme-surface rounded-xl border border-theme-border items-center">
								<Text className="text-4xl mb-3">🎮</Text>
								<Text className="text-theme-text-secondary text-center">
									{searchQuery
										? "No games match your search."
										: "No games available yet."}
								</Text>
								{searchQuery && (
									<Pressable onPress={clearFilters} className="mt-3">
										<Text className="text-theme-primary font-medium">
											Clear search
										</Text>
									</Pressable>
								)}
							</View>
						) : (
							<View className="flex-row flex-wrap justify-between">
								{games.map((game) => (
									<GameGridCard
										key={game.id}
										title={game.title}
										thumbnailUrl={game.thumbnailUrl}
										thumbnailEmoji="🌟"
										thumbnailBgClass="bg-theme-secondary/30"
										onPress={() =>
											router.push({
												pathname: "/game-detail/[id]",
												params: { id: game.id },
											})
										}
									/>
								))}

								{hasMore && (
									<Pressable
										onPress={loadMore}
										className="w-full bg-theme-surface p-4 rounded-xl border border-theme-border items-center active:bg-theme-surface-elevated mt-2"
									>
										<Text className="text-theme-primary font-medium">
											Load more games
										</Text>
									</Pressable>
								)}
							</View>
						)}
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}
