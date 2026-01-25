import { View, Text, Pressable, TextInput } from 'react-native';
import type { GameCategory, GameStatus, PlayerCount } from '@/lib/registry/types';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: GameStatus | "all";
  onStatusFilterChange: (status: GameStatus | "all") => void;
  categoryFilter: GameCategory | "all";
  onCategoryFilterChange: (category: GameCategory | "all") => void;
  playerFilter: PlayerCount | "all";
  onPlayerFilterChange: (players: PlayerCount | "all") => void;
  sortBy: "newest" | "popular" | "alphabetical" | "rating";
  onSortByChange: (sort: "newest" | "popular" | "alphabetical" | "rating") => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  onClearFilters: () => void;
}

const STATUS_OPTIONS: { value: GameStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "beta", label: "Beta" },
  { value: "archived", label: "Archived" },
];

const CATEGORY_OPTIONS: { value: GameCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "arcade", label: "Arcade" },
  { value: "puzzle", label: "Puzzle" },
  { value: "action", label: "Action" },
  { value: "casual", label: "Casual" },
  { value: "physics-demo", label: "Physics Demo" },
];

const PLAYER_OPTIONS: { value: PlayerCount | "all"; label: string }[] = [
  { value: "all", label: "Any" },
  { value: 1, label: "1P" },
  { value: 2, label: "2P" },
  { value: "1-2", label: "1-2P" },
  { value: "1-4", label: "1-4P" },
];

const SORT_OPTIONS: { value: "newest" | "popular" | "alphabetical" | "rating"; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Popular" },
  { value: "alphabetical", label: "A-Z" },
  { value: "rating", label: "Top Rated" },
];

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
}

function FilterChip({ label, selected, onPress, compact = false }: FilterChipProps) {
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

export function FilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  playerFilter,
  onPlayerFilterChange,
  sortBy,
  onSortByChange,
  showFilters,
  onToggleFilters,
  onClearFilters,
}: FilterBarProps) {
  const activeFilterCount = 
    (statusFilter !== "active" ? 1 : 0) + 
    (categoryFilter !== "all" ? 1 : 0) + 
    (playerFilter !== "all" ? 1 : 0) +
    (sortBy !== "newest" ? 1 : 0);

  return (
    <View>
      <View className="mb-4">
        <View className="flex-row items-center bg-gray-800 rounded-xl px-4 py-3 border border-gray-700">
          <Text className="text-gray-400 mr-3">🔍</Text>
          <TextInput
            className="flex-1 text-white text-base"
            placeholder="Search games..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={onSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => onSearchChange("")}>
              <Text className="text-gray-400 text-lg">✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View className="flex-row items-center justify-between mb-4">
        <Pressable
          onPress={onToggleFilters}
          className="flex-row items-center"
        >
          <Text className="text-indigo-400 font-medium">
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Text>
          <Text className="text-indigo-400 ml-2">{showFilters ? "▲" : "▼"}</Text>
        </Pressable>
        
        {activeFilterCount > 0 && (
          <Pressable onPress={onClearFilters}>
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
                  onPress={() => onSortByChange(option.value)}
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
                  onPress={() => onStatusFilterChange(option.value)}
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
                  onPress={() => onCategoryFilterChange(option.value)}
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
                  onPress={() => onPlayerFilterChange(option.value)}
                  compact
                />
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
