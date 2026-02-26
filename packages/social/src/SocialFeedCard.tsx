import { Ionicons } from "@expo/vector-icons";
import { tokens } from "@slopcade/theme";
import { useRouter } from "expo-router";
import { Image, Pressable, Share, Text, View } from "react-native";
import { FollowButton } from "./FollowButton";
import { useSocialTRPC } from "./trpc-context";

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
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

const AVATAR_COLORS = [
	"bg-indigo-600",
	"bg-emerald-600",
	"bg-amber-600",
	"bg-rose-600",
	"bg-cyan-600",
	"bg-violet-600",
];

function getAvatarColor(id: string): string {
	let hash = 0;
	for (let i = 0; i < id.length; i++)
		hash = (hash << 5) - hash + id.charCodeAt(i);
	return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatCount(n: number): string {
	if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
	if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
	return String(n);
}

export function SocialFeedCard({
	game,
	currentUserId,
	onCommentPress,
}: SocialFeedCardProps) {
	const router = useRouter();
	const trpc = useSocialTRPC();
	const utils = trpc.useUtils();

	const likeMut = trpc.social.addReaction.useMutation({
		onSuccess: () => utils.social.feed.invalidate(),
	});
	const unlikeMut = trpc.social.removeReaction.useMutation({
		onSuccess: () => utils.social.feed.invalidate(),
	});
	const bookmarkMut = trpc.social.bookmark.useMutation({
		onSuccess: () => utils.social.feed.invalidate(),
	});
	const unbookmarkMut = trpc.social.unbookmark.useMutation({
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
		router.push({ pathname: "/game-detail/[id]", params: { id: game.id } });
	};

	const handleShare = async () => {
		try {
			await Share.share({
				message: `Check out "${game.title}" on Slopcade!`,
			});
		} catch {}
	};

	return (
		<View className="bg-theme-surface-elevated border-b border-theme-border">
			{/* Header - Creator info */}
			<View className="flex-row items-center px-4 py-3">
				<Pressable
					className="flex-row items-center flex-1"
					onPress={handleCreatorPress}
					accessibilityRole="button"
					accessibilityLabel={`View ${game.creator.displayName ?? "Anonymous"}'s profile`}
				>
					<View
						className={`w-9 h-9 rounded-full items-center justify-center ${getAvatarColor(game.creator.id ?? "anon")}`}
					>
						<Text className="text-theme-text-inverse font-bold text-xs">
							{getInitials(game.creator.displayName)}
						</Text>
					</View>
					<View className="ml-3 flex-1">
						<Text
							className="text-theme-text font-semibold text-sm"
							numberOfLines={1}
						>
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

				<Text className="text-theme-text-secondary text-xs ml-3">
					{timeAgo(game.createdAt)}
				</Text>
			</View>

			{/* Thumbnail / Game Preview */}
			<Pressable
				onPress={handleGamePress}
				accessibilityRole="button"
				accessibilityLabel={`Play ${game.title}`}
			>
				{game.thumbnailUrl ? (
					<Image
						source={{ uri: game.thumbnailUrl }}
						className="w-full aspect-video"
						resizeMode="cover"
					/>
				) : (
					<View className="w-full aspect-video bg-theme-surface items-center justify-center">
						<Text className="text-5xl">🎮</Text>
						<Text className="text-theme-text-secondary text-sm mt-2">
							{game.title}
						</Text>
					</View>
				)}
			</Pressable>

			{/* Action Bar */}
			<View className="flex-row items-center px-4 py-2.5">
				<View className="flex-row items-center flex-1 gap-5">
					<Pressable
						className="flex-row items-center"
						onPress={handleLike}
						disabled={!currentUserId}
						accessibilityRole="button"
						accessibilityLabel={game.isLiked ? "Unlike" : "Like"}
						accessibilityState={{ selected: game.isLiked }}
					>
						<Ionicons
							name={game.isLiked ? "heart" : "heart-outline"}
							size={26}
							color={
								game.isLiked
									? tokens.semantic.colors.error
									: tokens.semantic.colors.text.primary
							}
						/>
					</Pressable>

					<Pressable
						className="flex-row items-center"
						onPress={() => onCommentPress(game.id)}
						accessibilityRole="button"
						accessibilityLabel="View comments"
					>
						<Ionicons
							name="chatbubble-outline"
							size={24}
							color={tokens.semantic.colors.text.primary}
						/>
					</Pressable>

					<Pressable
						onPress={handleGamePress}
						accessibilityRole="button"
						accessibilityLabel={`Play ${game.title}`}
					>
						<Ionicons
							name="play-circle-outline"
							size={26}
							color={tokens.semantic.colors.text.primary}
						/>
					</Pressable>

					<Pressable
						onPress={handleShare}
						accessibilityRole="button"
						accessibilityLabel="Share game"
					>
						<Ionicons
							name="paper-plane-outline"
							size={24}
							color={tokens.semantic.colors.text.primary}
						/>
					</Pressable>
				</View>

				<Pressable
					onPress={handleBookmark}
					disabled={!currentUserId}
					accessibilityRole="button"
					accessibilityLabel={
						game.isBookmarked ? "Remove bookmark" : "Bookmark"
					}
					accessibilityState={{ selected: game.isBookmarked }}
				>
					<Ionicons
						name={game.isBookmarked ? "bookmark" : "bookmark-outline"}
						size={24}
						color={
							game.isBookmarked
								? tokens.semantic.colors.warning
								: tokens.semantic.colors.text.primary
						}
					/>
				</Pressable>
			</View>

			{/* Counts */}
			<View className="px-4 pb-1">
				{game.likeCount > 0 && (
					<Text className="text-theme-text font-semibold text-sm">
						{formatCount(game.likeCount)}{" "}
						{game.likeCount === 1 ? "like" : "likes"}
					</Text>
				)}
			</View>

			{/* Title & Description */}
			<View className="px-4 pb-1">
				<Text className="text-theme-text text-sm" numberOfLines={2}>
					<Text className="font-semibold">
						{game.creator.displayName ?? "Anonymous"}{" "}
					</Text>
					{game.title}
					{game.description ? ` - ${game.description}` : ""}
				</Text>
			</View>

			{/* Rating */}
			{game.ratingCount > 0 && (
				<View className="px-4 pb-1 flex-row items-center gap-1">
					<Ionicons
						name="star"
						size={12}
						color={tokens.semantic.colors.warning}
					/>
					<Text className="text-theme-text-secondary text-xs">
						{game.ratingAverage.toFixed(1)} ({game.ratingCount})
					</Text>
				</View>
			)}

			{/* Comment count link */}
			{game.commentCount > 0 && (
				<Pressable
					className="px-4 pb-1"
					onPress={() => onCommentPress(game.id)}
					accessibilityRole="button"
					accessibilityLabel={`View ${game.commentCount === 1 ? "1 comment" : `all ${game.commentCount} comments`}`}
				>
					<Text className="text-theme-text-secondary text-sm">
						View{" "}
						{game.commentCount === 1
							? "1 comment"
							: `all ${game.commentCount} comments`}
					</Text>
				</Pressable>
			)}

			{/* Play count */}
			<View className="px-4 pb-3">
				<Text className="text-theme-text-tertiary text-xs">
					{formatCount(game.playCount)} plays
				</Text>
			</View>
		</View>
	);
}
