import { View, Text, Pressable, ScrollView, ActivityIndicator, RefreshControl, TextInput, Image } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TESTGAMES } from "@/lib/registry/generated/testGames";
import type { GameCategory, GameStatus, PlayerCount } from "@/lib/registry/types";
import { trpc } from "@/lib/trpc/client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

interface PublicGame {
  id: string;
  title: string;
  description: string | null;
  playCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  userId: string | null;
  definition: string;
  thumbnailUrl: string | null;
  isPublic: boolean;
}

type StatusFilter = GameStatus | "all";
type CategoryFilter = GameCategory | "all";
type PlayerFilter = PlayerCount | "all";
type SortOption = "newest" | "popular" | "alphabetical" | "rating";

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "beta", label: "Beta" },
  { value: "archived", label: "Archived" },
];

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "arcade", label: "Arcade" },
  { value: "puzzle", label: "Puzzle" },
  { value: "action", label: "Action" },
  { value: "casual", label: "Casual" },
  { value: "physics-demo", label: "Physics Demo" },
];

const PLAYER_OPTIONS: { value: PlayerFilter; label: string }[] = [
  { value: "all", label: "Any" },
  { value: 1, label: "1P" },
  { value: 2, label: "2P" },
  { value: "1-2", label: "1-2P" },
  { value: "1-4", label: "1-4P" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Popular" },
  { value: "alphabetical", label: "A-Z" },
  { value: "rating", label: "Top Rated" },
];

function FilterChip({ 
  label, 
  selected, 
  onPress,
  compact = false,
}: { 
  label: string; 
  selected: boolean; 
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full mr-2 mb-2 ${compact ? "px-2.5 py-1" : "px-3 py-1.5"} ${
        selected ? "bg-indigo-600" : "bg-gray-700"
      }`}
    >
      <Text className={`${compact ? "text-xs" : "text-sm"} ${selected ? "text-white font-medium" : "text-gray-300"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function GameGridCard({ 
  title, 
  status,
  category,
  players,
  thumbnailUrl,
  thumbnailEmoji = "🎮",
  thumbnailBgClass = "bg-indigo-900/30",
  onPress,
}: {
  title: string;
  status?: GameStatus;
  category?: GameCategory;
  players?: PlayerCount;
  thumbnailUrl?: string | null;
  thumbnailEmoji?: string;
  thumbnailBgClass?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      className="w-[48%] bg-gray-800 rounded-xl border border-gray-700 overflow-hidden active:bg-gray-700 mb-3"
      onPress={onPress}
    >
      <View className={`w-full aspect-square ${thumbnailBgClass} items-center justify-center overflow-hidden`}>
        {thumbnailUrl ? (
          <Image
            source={{ uri: thumbnailUrl }}
            className="w-full h-full"
            resizeMode="contain"
          />
        ) : (
          <Text className="text-5xl">{thumbnailEmoji}</Text>
        )}
        
        {status === "archived" && (
          <View className="absolute top-2 right-2 px-2 py-0.5 bg-gray-900/80 rounded">
            <Text className="text-[10px] text-gray-300 font-medium">Archived</Text>
          </View>
        )}
        {status === "beta" && (
          <View className="absolute top-2 right-2 px-2 py-0.5 bg-yellow-600/90 rounded">
            <Text className="text-[10px] text-white font-medium">Beta</Text>
          </View>
        )}
        {players && (
          <View className="absolute top-2 right-2 px-2 py-0.5 bg-gray-900/80 rounded">
            <Text className="text-[10px] text-gray-300 font-medium">{players}P</Text>
          </View>
        )}
      </View>
      
      <View className="p-2">
        <Text className="text-sm font-semibold text-white text-center" numberOfLines={1}>
          {title}
        </Text>
        {category && (
          <Text className="text-[10px] text-indigo-400 text-center mt-0.5" numberOfLines={1}>
            {category}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function GameCard({ 
  title, 
  description, 
  status, 
  category,
  players,
  thumbnailUrl,
  thumbnailEmoji = "🎮",
  thumbnailBgClass = "bg-indigo-900/30",
  meta,
  onPress,
}: {
  title: string;
  description?: string | null;
  status?: GameStatus;
  category?: GameCategory;
  players?: PlayerCount;
  thumbnailUrl?: string | null;
  thumbnailEmoji?: string;
  thumbnailBgClass?: string;
  meta?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-3 active:bg-gray-700"
      onPress={onPress}
    >
      <View className="flex-row items-center">
        <View className={`w-16 h-16 ${thumbnailBgClass} rounded-lg items-center justify-center mr-4 overflow-hidden`}>
          {thumbnailUrl ? (
            <Image
              source={{ uri: thumbnailUrl }}
              className="w-full h-full"
              resizeMode="contain"
            />
          ) : (
            <Text className="text-3xl">{thumbnailEmoji}</Text>
          )}
        </View>
        <View className="flex-1">
          <View className="flex-row items-center flex-wrap">
            <Text className="text-lg font-semibold text-white">{title}</Text>
            {status === "archived" && (
              <View className="ml-2 px-2 py-0.5 bg-gray-600 rounded">
                <Text className="text-xs text-gray-300">Archived</Text>
              </View>
            )}
            {status === "beta" && (
              <View className="ml-2 px-2 py-0.5 bg-yellow-600 rounded">
                <Text className="text-xs text-white">Beta</Text>
              </View>
            )}
            {players && (
              <View className="ml-2 px-2 py-0.5 bg-gray-700 rounded">
                <Text className="text-xs text-gray-300">{players}P</Text>
              </View>
            )}
          </View>
          {description && (
            <Text className="text-gray-400 mt-1" numberOfLines={2}>
              {description}
            </Text>
          )}
          <View className="flex-row items-center mt-1">
            {category && (
              <Text className="text-xs text-indigo-400">{category}</Text>
            )}
            {meta && (
              <Text className="text-xs text-gray-500 ml-2">{meta}</Text>
            )}
          </View>
        </View>
        <Text className="text-gray-500 text-xl ml-2">→</Text>
      </View>
    </Pressable>
  );
}

function Pagination({
  currentPage,
  totalPages,
  hasMore,
  isLoading,
  onPrevious,
  onNext,
}: {
  currentPage: number;
  totalPages?: number;
  hasMore: boolean;
  isLoading: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (totalPages !== undefined && totalPages <= 1) return null;
  if (!hasMore && currentPage === 1) return null;

  return (
    <View className="flex-row items-center justify-center mt-4 mb-2">
      <Pressable
        onPress={onPrevious}
        disabled={currentPage === 1 || isLoading}
        className={`px-4 py-2 rounded-lg mr-2 ${
          currentPage === 1 || isLoading ? "bg-gray-700 opacity-50" : "bg-gray-700 active:bg-gray-600"
        }`}
      >
        <Text className="text-white font-medium">← Previous</Text>
      </Pressable>
      
      <View className="px-4 py-2">
        <Text className="text-gray-400">
          Page {currentPage}{totalPages ? ` of ${totalPages}` : ""}
        </Text>
      </View>
      
      <Pressable
        onPress={onNext}
        disabled={!hasMore || isLoading}
        className={`px-4 py-2 rounded-lg ml-2 ${
          !hasMore || isLoading ? "bg-gray-700 opacity-50" : "bg-indigo-600 active:bg-indigo-700"
        }`}
      >
        <Text className="text-white font-medium">
          {isLoading ? "Loading..." : "Next →"}
        </Text>
      </Pressable>
    </View>
  );
}

export default function BrowseScreen() {
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [playerFilter, setPlayerFilter] = useState<PlayerFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [publicGames, setPublicGames] = useState<PublicGame[]>([]);
  const [isLoadingPublic, setIsLoadingPublic] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [publicGamesPage, setPublicGamesPage] = useState(1);
  const [hasMorePublicGames, setHasMorePublicGames] = useState(true);
  const [totalPublicGames, setTotalPublicGames] = useState(0);

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

  const totalTemplatePages = Math.ceil(filteredAndSortedGames.length / PAGE_SIZE);
  const hasMoreTemplateGames = currentPage < totalTemplatePages;

  const filterKey = `${statusFilter}-${categoryFilter}-${playerFilter}-${searchQuery}-${sortBy}`;
  const prevFilterKey = usePrevious(filterKey);
  
  if (filterKey !== prevFilterKey && currentPage !== 1) {
    setCurrentPage(1);
  }

  const fetchPublicGames = useCallback(async (page: number, showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else if (page === 1) setIsLoadingPublic(true);

    try {
      const result = await trpc.games.listPublic.query({ 
        limit: PAGE_SIZE, 
        offset: (page - 1) * PAGE_SIZE 
      });
      
      if (page === 1) {
        setPublicGames(result);
      } else {
        setPublicGames(prev => [...prev, ...result]);
      }
      
      setHasMorePublicGames(result.length === PAGE_SIZE);
      setTotalPublicGames(prev => page === 1 ? result.length : prev);
    } catch (err) {
      console.error("Failed to load public games:", err);
      if (page === 1) setPublicGames([]);
    } finally {
      setIsLoadingPublic(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPublicGames(1);
  }, [fetchPublicGames]);

  const handleRefresh = useCallback(() => {
    setPublicGamesPage(1);
    fetchPublicGames(1, true);
  }, [fetchPublicGames]);

  const activeFilterCount = 
    (statusFilter !== "active" ? 1 : 0) + 
    (categoryFilter !== "all" ? 1 : 0) + 
    (playerFilter !== "all" ? 1 : 0) +
    (sortBy !== "newest" ? 1 : 0);

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

          <View className="mb-4">
            <View className="flex-row items-center bg-gray-800 rounded-xl px-4 py-3 border border-gray-700">
              <Text className="text-gray-400 mr-3">🔍</Text>
              <TextInput
                className="flex-1 text-white text-base"
                placeholder="Search games..."
                placeholderTextColor="#6B7280"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")}>
                  <Text className="text-gray-400 text-lg">✕</Text>
                </Pressable>
              )}
            </View>
          </View>

          <View className="flex-row items-center justify-between mb-4">
            <Pressable
              onPress={() => setShowFilters(!showFilters)}
              className="flex-row items-center"
            >
              <Text className="text-indigo-400 font-medium">
                Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
              </Text>
              <Text className="text-indigo-400 ml-2">{showFilters ? "▲" : "▼"}</Text>
            </Pressable>
            
            {activeFilterCount > 0 && (
              <Pressable onPress={clearFilters}>
                <Text className="text-gray-400 text-sm">Clear all</Text>
              </Pressable>
            )}
          </View>

          {showFilters && (
            <View className="mb-4 p-3 bg-gray-800 rounded-xl">
              <View className="mb-3">
                <Text className="text-gray-400 text-xs mb-2 uppercase tracking-wide">Sort By</Text>
                <View className="flex-row flex-wrap">
                  {SORT_OPTIONS.map((option) => (
                    <FilterChip
                      key={option.value}
                      label={option.label}
                      selected={sortBy === option.value}
                      onPress={() => setSortBy(option.value)}
                      compact
                    />
                  ))}
                </View>
              </View>

              <View className="mb-3">
                <Text className="text-gray-400 text-xs mb-2 uppercase tracking-wide">Status</Text>
                <View className="flex-row flex-wrap">
                  {STATUS_OPTIONS.map((option) => (
                    <FilterChip
                      key={option.value}
                      label={option.label}
                      selected={statusFilter === option.value}
                      onPress={() => setStatusFilter(option.value)}
                      compact
                    />
                  ))}
                </View>
              </View>

              <View className="mb-3">
                <Text className="text-gray-400 text-xs mb-2 uppercase tracking-wide">Category</Text>
                <View className="flex-row flex-wrap">
                  {CATEGORY_OPTIONS.map((option) => (
                    <FilterChip
                      key={option.value}
                      label={option.label}
                      selected={categoryFilter === option.value}
                      onPress={() => setCategoryFilter(option.value)}
                      compact
                    />
                  ))}
                </View>
              </View>

              <View>
                <Text className="text-gray-400 text-xs mb-2 uppercase tracking-wide">Players</Text>
                <View className="flex-row flex-wrap">
                  {PLAYER_OPTIONS.map((option) => (
                    <FilterChip
                      key={String(option.value)}
                      label={option.label}
                      selected={playerFilter === option.value}
                      onPress={() => setPlayerFilter(option.value)}
                      compact
                    />
                  ))}
                </View>
              </View>
            </View>
          )}

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
                      setPublicGamesPage(nextPage);
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
