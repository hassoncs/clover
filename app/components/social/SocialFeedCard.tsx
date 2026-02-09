import { View, Text, Pressable, Image, Share } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { trpcReact } from "@/lib/trpc/react";
import { FollowButton } from "./FollowButton";

interface FeedGame {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  playCount: number;
  likeCount: number;
  commentCount: number;
  ratingAverage: number;
  ratingCount: number;
  createdAt: number;
  creator: {
    id: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  isLiked: boolean;
  isBookmarked: boolean;
  isFollowingCreator: boolean;
}

interface SocialFeedCardProps {
  game: FeedGame;
  currentUserId: string | null;
  onCommentPress: (gameId: string) => void;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  return `${Math.floor(days / 30)}mo`;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ["bg-indigo-600", "bg-emerald-600", "bg-amber-600", "bg-rose-600", "bg-cyan-600", "bg-violet-600"];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash << 5) - hash + id.charCodeAt(i);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function SocialFeedCard({ game, currentUserId, onCommentPress }: SocialFeedCardProps) {
  const router = useRouter();
  const utils = trpcReact.useUtils();

  const likeMut = trpcReact.social.addReaction.useMutation({
    onSuccess: () => utils.social.feed.invalidate(),
  });
  const unlikeMut = trpcReact.social.removeReaction.useMutation({
    onSuccess: () => utils.social.feed.invalidate(),
  });
  const bookmarkMut = trpcReact.social.bookmark.useMutation({
    onSuccess: () => utils.social.feed.invalidate(),
  });
  const unbookmarkMut = trpcReact.social.unbookmark.useMutation({
    onSuccess: () => utils.social.feed.invalidate(),
  });

  const handleLike = () => {
    if (!currentUserId) return;
    if (game.isLiked) {
      unlikeMut.mutate({ targetType: "game", targetId: game.id });
    } else {
      likeMut.mutate({ targetType: "game", targetId: game.id });
    }
  };

  const handleBookmark = () => {
    if (!currentUserId) return;
    if (game.isBookmarked) {
      unbookmarkMut.mutate({ gameId: game.id });
    } else {
      bookmarkMut.mutate({ gameId: game.id });
    }
  };

  const handleCreatorPress = () => {
    if (game.creator.id) {
      router.push({ pathname: "/user/[id]", params: { id: game.creator.id } });
    }
  };

  const handleGamePress = () => {
    router.push({ pathname: "/game-detail/[id]", params: { id: game.id, source: "database" } });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out "${game.title}" on Slopcade!`,
      });
    } catch {}
  };

  return (
    <View className="bg-gray-900 border-b border-gray-800">
      {/* Header - Creator info */}
      <View className="flex-row items-center px-4 py-3">
        <Pressable className="flex-row items-center flex-1" onPress={handleCreatorPress}>
          <View className={`w-9 h-9 rounded-full items-center justify-center ${getAvatarColor(game.creator.id ?? "anon")}`}>
            <Text className="text-white font-bold text-xs">
              {getInitials(game.creator.displayName)}
            </Text>
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-white font-semibold text-sm" numberOfLines={1}>
              {game.creator.displayName ?? "Anonymous"}
            </Text>
          </View>
        </Pressable>

        {game.creator.id && (
          <FollowButton
            targetUserId={game.creator.id}
            currentUserId={currentUserId}
            initialIsFollowing={game.isFollowingCreator}
            compact
          />
        )}

        <Text className="text-gray-500 text-xs ml-3">{timeAgo(game.createdAt)}</Text>
      </View>

      {/* Thumbnail / Game Preview */}
      <Pressable onPress={handleGamePress}>
        {game.thumbnailUrl ? (
          <Image
            source={{ uri: game.thumbnailUrl }}
            className="w-full aspect-video"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full aspect-video bg-gray-800 items-center justify-center">
            <Text className="text-5xl">🎮</Text>
            <Text className="text-gray-500 text-sm mt-2">{game.title}</Text>
          </View>
        )}
      </Pressable>

      {/* Action Bar */}
      <View className="flex-row items-center px-4 py-2.5">
        <View className="flex-row items-center flex-1 gap-5">
          <Pressable className="flex-row items-center" onPress={handleLike} disabled={!currentUserId}>
            <Ionicons
              name={game.isLiked ? "heart" : "heart-outline"}
              size={26}
              color={game.isLiked ? "#EF4444" : "#E4E4E7"}
            />
          </Pressable>

          <Pressable className="flex-row items-center" onPress={() => onCommentPress(game.id)}>
            <Ionicons name="chatbubble-outline" size={24} color="#E4E4E7" />
          </Pressable>

          <Pressable onPress={handleGamePress}>
            <Ionicons name="play-circle-outline" size={26} color="#E4E4E7" />
          </Pressable>

          <Pressable onPress={handleShare}>
            <Ionicons name="paper-plane-outline" size={24} color="#E4E4E7" />
          </Pressable>
        </View>

        <Pressable onPress={handleBookmark} disabled={!currentUserId}>
          <Ionicons
            name={game.isBookmarked ? "bookmark" : "bookmark-outline"}
            size={24}
            color={game.isBookmarked ? "#FBBF24" : "#E4E4E7"}
          />
        </Pressable>
      </View>

      {/* Counts */}
      <View className="px-4 pb-1">
        {game.likeCount > 0 && (
          <Text className="text-white font-semibold text-sm">
            {formatCount(game.likeCount)} {game.likeCount === 1 ? "like" : "likes"}
          </Text>
        )}
      </View>

      {/* Title & Description */}
      <View className="px-4 pb-1">
        <Text className="text-white text-sm" numberOfLines={2}>
          <Text className="font-semibold">{game.creator.displayName ?? "Anonymous"} </Text>
          {game.title}
          {game.description ? ` - ${game.description}` : ""}
        </Text>
      </View>

      {/* Rating */}
      {game.ratingCount > 0 && (
        <View className="px-4 pb-1 flex-row items-center gap-1">
          <Ionicons name="star" size={12} color="#FBBF24" />
          <Text className="text-gray-400 text-xs">
            {game.ratingAverage.toFixed(1)} ({game.ratingCount})
          </Text>
        </View>
      )}

      {/* Comment count link */}
      {game.commentCount > 0 && (
        <Pressable className="px-4 pb-1" onPress={() => onCommentPress(game.id)}>
          <Text className="text-gray-500 text-sm">
            View {game.commentCount === 1 ? "1 comment" : `all ${game.commentCount} comments`}
          </Text>
        </Pressable>
      )}

      {/* Play count */}
      <View className="px-4 pb-3">
        <Text className="text-gray-600 text-xs">
          {formatCount(game.playCount)} plays
        </Text>
      </View>
    </View>
  );
}
