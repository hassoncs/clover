import { View, Text, Pressable, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useMemo } from "react";
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
    publicGames,
    isLoadingPublic,
    isRefreshing,
    hasMorePublicGames,
    publicGamesPage,
    fetchPublicGames,
    handleRefresh,
  } = useBrowseGames({ pageSize: PAGE_SIZE });

  const filteredGames = useMemo(() => {
    let games = publicGames;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      games = games.filter(game => {
        const matchesTitle = game.title.toLowerCase().includes(query);
        const matchesDescription = game.description?.toLowerCase().includes(query);
        return matchesTitle || matchesDescription;
      });
    }

    return [...games].sort((a, b) => {
      switch (sortBy) {
        case "alphabetical":
          return a.title.localeCompare(b.title);
        case "popular":
          return b.playCount - a.playCount;
        case "newest":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [publicGames, searchQuery, sortBy]);

  const clearFilters = () => {
    setSortBy("popular");
    setSearchQuery("");
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-900" edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#4CAF50"
          />
        }
      >
        <View className="p-4">
          <View className="mb-4">
            <Text className="text-2xl font-bold text-white">Browse Games</Text>
            <Text className="text-gray-400 mt-1">
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
              <Text className="text-lg font-semibold text-white">Games</Text>
              {!isLoadingPublic && filteredGames.length > 0 && (
                <Text className="text-gray-500 text-sm">
                  {filteredGames.length} {filteredGames.length === 1 ? "game" : "games"}
                </Text>
              )}
            </View>

            {isLoadingPublic ? (
              <View className="items-center py-12">
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text className="text-gray-400 mt-4">Loading games...</Text>
              </View>
            ) : filteredGames.length === 0 ? (
              <View className="p-6 bg-gray-800 rounded-xl border border-gray-700 items-center">
                <Text className="text-4xl mb-3">🎮</Text>
                <Text className="text-gray-400 text-center">
                  {searchQuery ? "No games match your search." : "No games available yet."}
                </Text>
                {searchQuery && (
                  <Pressable onPress={clearFilters} className="mt-3">
                    <Text className="text-indigo-400 font-medium">Clear search</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <View className="flex-row flex-wrap justify-between">
                {filteredGames.map((game) => (
                  <GameGridCard
                    key={game.id}
                    title={game.title}
                    thumbnailUrl={game.thumbnailUrl}
                    thumbnailEmoji="🌟"
                    thumbnailBgClass="bg-green-900/30"
                    onPress={() => router.push({
                      pathname: "/game-detail/[id]",
                      params: { id: game.id }
                    })}
                  />
                ))}

                {hasMorePublicGames && (
                  <Pressable
                    onPress={() => {
                      const nextPage = publicGamesPage + 1;
                      fetchPublicGames(nextPage);
                    }}
                    className="bg-gray-800 p-4 rounded-xl border border-gray-700 items-center active:bg-gray-700"
                  >
                    <Text className="text-indigo-400 font-medium">Load more games</Text>
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
