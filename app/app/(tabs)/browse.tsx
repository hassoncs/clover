import { View, Text, Pressable, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TESTGAMES } from "@/lib/registry/generated/testGames";
import type { GameCategory, GameStatus, PlayerCount } from "@/lib/registry/types";
import { useState, useEffect, useMemo, useRef } from "react";
import { FilterBar } from "@/components/browse/FilterBar";
import { GameGridCard } from "@/components/browse/GameCard";
import { useBrowseGames } from "@/hooks/useBrowseGames";

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

type StatusFilter = GameStatus | "all";
type CategoryFilter = GameCategory | "all";
type PlayerFilter = PlayerCount | "all";
type SortOption = "newest" | "popular" | "alphabetical" | "rating";

const PAGE_SIZE = 10;

export default function BrowseScreen() {
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [playerFilter, setPlayerFilter] = useState<PlayerFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const {
    publicGames,
    isLoadingPublic,
    isRefreshing,
    hasMorePublicGames,
    publicGamesPage,
    fetchPublicGames,
    handleRefresh,
  } = useBrowseGames({ pageSize: PAGE_SIZE });

  const filteredAndSortedGames = useMemo(() => {
    let games = TESTGAMES.filter((game) => {
      const gameStatus = game.meta.status ?? "active";
      const gameCategory = game.meta.category;
      const gamePlayers = game.meta.players;

      if (statusFilter !== "all" && gameStatus !== statusFilter) return false;
      if (categoryFilter !== "all" && gameCategory !== categoryFilter) return false;
      if (playerFilter !== "all" && gamePlayers !== playerFilter) return false;
      
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = game.meta.title.toLowerCase().includes(query);
        const matchesDescription = game.meta.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDescription) return false;
      }
      
      return true;
    });

    games = [...games].sort((a, b) => {
      switch (sortBy) {
        case "alphabetical":
          return a.meta.title.localeCompare(b.meta.title);
        case "popular":
          return 0;
        case "rating":
          return (b.meta.rating ?? 0) - (a.meta.rating ?? 0);
        case "newest":
        default:
          return 0;
      }
    });

    return games;
  }, [statusFilter, categoryFilter, playerFilter, searchQuery, sortBy]);

  const paginatedGames = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSortedGames.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredAndSortedGames, currentPage]);

  const filterKey = `${statusFilter}-${categoryFilter}-${playerFilter}-${searchQuery}-${sortBy}`;
  const prevFilterKey = usePrevious(filterKey);
  
  if (filterKey !== prevFilterKey && currentPage !== 1) {
    setCurrentPage(1);
  }

  const clearFilters = () => {
    setStatusFilter("active");
    setCategoryFilter("all");
    setPlayerFilter("all");
    setSortBy("newest");
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
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            playerFilter={playerFilter}
            onPlayerFilterChange={setPlayerFilter}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            showFilters={false}
            onToggleFilters={() => {}}
            onClearFilters={clearFilters}
          />

          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-semibold text-white">Template Games</Text>
              <Text className="text-gray-500 text-sm">
                {filteredAndSortedGames.length} {filteredAndSortedGames.length === 1 ? "game" : "games"}
              </Text>
            </View>

            {paginatedGames.length === 0 ? (
              <View className="p-6 bg-gray-800 rounded-xl border border-gray-700 items-center">
                <Text className="text-4xl mb-3">🎮</Text>
                <Text className="text-gray-400 text-center">
                  No games match your filters.
                </Text>
                <Pressable onPress={clearFilters} className="mt-3">
                  <Text className="text-indigo-400 font-medium">Clear filters</Text>
                </Pressable>
              </View>
            ) : (
              <View className="flex-row flex-wrap justify-between">
                {paginatedGames.map((game) => (
                  <GameGridCard
                    key={game.id}
                    title={game.meta.title}
                    status={game.meta.status}
                    category={game.meta.category}
                    players={game.meta.players}
                    thumbnailUrl={game.meta.titleHeroImageUrl}
                    onPress={() => router.push({ 
                      pathname: "/game-detail/[id]", 
                      params: { id: game.id, source: "template" } 
                    })}
                  />
                ))}
              </View>
            )}
          </View>

          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-semibold text-white">Community Games</Text>
              {!isLoadingPublic && publicGames.length > 0 && (
                <Text className="text-gray-500 text-sm">
                  {publicGames.length} {publicGames.length === 1 ? "game" : "games"}
                </Text>
              )}
            </View>
            
            {isLoadingPublic ? (
              <View className="items-center py-12">
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text className="text-gray-400 mt-4">Loading community games...</Text>
              </View>
            ) : publicGames.length === 0 ? (
              <View className="p-6 bg-gray-800 rounded-xl border border-gray-700 items-center">
                <Text className="text-4xl mb-3">🌟</Text>
                <Text className="text-gray-400 text-center">
                  No public games yet.{"\n"}Be the first to publish!
                </Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap justify-between">
                {publicGames.map((game) => (
                  <GameGridCard
                    key={game.id}
                    title={game.title}
                    thumbnailUrl={game.thumbnailUrl}
                    thumbnailEmoji="🌟"
                    thumbnailBgClass="bg-green-900/30"
                    onPress={() => router.push({ 
                      pathname: "/game-detail/[id]", 
                      params: { id: game.id, source: "database" } 
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
