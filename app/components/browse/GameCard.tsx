import { View, Text, Pressable, Image } from "react-native";
import type { GameCategory, GameStatus, PlayerCount } from "@/lib/registry/types";

interface GameGridCardProps {
  title: string;
  status?: GameStatus;
  category?: GameCategory;
  players?: PlayerCount;
  thumbnailUrl?: string | null;
  thumbnailEmoji?: string;
  thumbnailBgClass?: string;
  onPress: () => void;
}

export function GameGridCard({ 
  title,
  status,
  category,
  players,
  thumbnailUrl,
  thumbnailEmoji = "🎮",
  thumbnailBgClass = "bg-indigo-900/30",
  onPress,
}: GameGridCardProps) {
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

interface GameCardProps {
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
}

export function GameCard({ 
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
}: GameCardProps) {
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

interface PaginationProps {
  currentPage: number;
  totalPages?: number;
  hasMore: boolean;
  isLoading: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function Pagination({
  currentPage,
  totalPages,
  hasMore,
  isLoading,
  onPrevious,
  onNext,
}: PaginationProps) {
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
