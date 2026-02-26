import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text } from "react-native";
import { useSocialTRPC } from "./trpc-context";

interface LikeButtonProps {
	gameId: string;
	likeCount: number;
	currentUserId: string | null;
}

export function LikeButton({
	gameId,
	likeCount,
	currentUserId,
}: LikeButtonProps) {
	const trpc = useSocialTRPC();
	const utils = trpc.useUtils();

	const reactionStatus = trpc.social.getReactionStatus.useQuery(
		{ targetType: "game", targetIds: [gameId] },
		{ enabled: !!currentUserId },
	);

	const addReaction = trpc.social.addReaction.useMutation({
		onSuccess: () => {
			utils.social.getReactionStatus.invalidate({
				targetType: "game",
				targetIds: [gameId],
			});
		},
	});

	const removeReaction = trpc.social.removeReaction.useMutation({
		onSuccess: () => {
			utils.social.getReactionStatus.invalidate({
				targetType: "game",
				targetIds: [gameId],
			});
		},
	});

	const isLiked = reactionStatus.data?.[gameId] ?? false;
	const isPending = addReaction.isPending || removeReaction.isPending;

	const handlePress = () => {
		if (!currentUserId || isPending) return;
		if (isLiked) {
			removeReaction.mutate({ targetType: "game", targetId: gameId });
		} else {
			addReaction.mutate({ targetType: "game", targetId: gameId });
		}
	};

	return (
		<Pressable
			className="flex-row items-center gap-1.5"
			onPress={handlePress}
			disabled={!currentUserId || isPending}
			accessibilityRole="button"
			accessibilityLabel={isLiked ? "Unlike" : "Like"}
			accessibilityState={{ selected: isLiked }}
		>
			<Ionicons
				name={isLiked ? "heart" : "heart-outline"}
				size={22}
				color={isLiked ? "#EF4444" : "#9CA3AF"}
			/>
			<Text className={`text-sm ${isLiked ? "text-red-400" : "text-gray-400"}`}>
				{likeCount > 0 ? likeCount : ""}
			</Text>
		</Pressable>
	);
}
