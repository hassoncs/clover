import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	Text,
	TextInput,
	View,
} from "react-native";
import { CommentItem } from "./CommentItem";
import { useSocialTRPC } from "./trpc-context";

interface GameCommentsProps {
	gameId: string;
	currentUserId: string | null;
}

export function GameComments({ gameId, currentUserId }: GameCommentsProps) {
	const [commentText, setCommentText] = useState("");
	const [cursor, setCursor] = useState<number | undefined>(undefined);
	const trpc = useSocialTRPC();

	const utils = trpc.useUtils();

	const { data, isLoading } = trpc.social.listComments.useQuery({
		gameId,
		limit: 50,
		cursor,
	});

	const addComment = trpc.social.addComment.useMutation({
		onSuccess: () => {
			setCommentText("");
			utils.social.listComments.invalidate({ gameId });
		},
	});

	const handleSubmit = () => {
		const trimmed = commentText.trim();
		if (!trimmed || !currentUserId) return;
		addComment.mutate({ gameId, body: trimmed });
	};

	const handleReplyAdded = useCallback(() => {
		utils.social.listComments.invalidate({ gameId });
	}, [gameId, utils]);

	const comments = data?.comments ?? [];
	const hasMore = data?.nextCursor != null;

	return (
		<View>
			<View className="flex-row items-center px-4 py-3 border-b border-gray-800">
				<Ionicons name="chatbubble-outline" size={18} color="#E4E4E7" />
				<Text className="text-white font-semibold text-base ml-2">
					Comments
				</Text>
				{comments.length > 0 && (
					<View className="bg-gray-700 rounded-full px-2 py-0.5 ml-2">
						<Text className="text-gray-300 text-xs">{comments.length}</Text>
					</View>
				)}
			</View>

			{currentUserId && (
				<View className="px-4 py-3 border-b border-gray-800">
					<View className="flex-row items-center">
						<TextInput
							className="flex-1 bg-gray-800 px-4 py-3 rounded-xl text-white text-sm border border-gray-700"
							placeholder="Add a comment..."
							placeholderTextColor="#666"
							value={commentText}
							onChangeText={setCommentText}
							multiline
							maxLength={2000}
							accessibilityLabel="Comment text input"
						/>
						<Pressable
							className="ml-3 p-2"
							onPress={handleSubmit}
							disabled={!commentText.trim() || addComment.isPending}
							accessibilityRole="button"
							accessibilityLabel="Send comment"
						>
							{addComment.isPending ? (
								<ActivityIndicator size="small" color="#818CF8" />
							) : (
								<Ionicons
									name="send"
									size={20}
									color={commentText.trim() ? "#818CF8" : "#4B5563"}
								/>
							)}
						</Pressable>
					</View>
				</View>
			)}

			{isLoading ? (
				<View className="items-center py-8">
					<ActivityIndicator size="large" color="#818CF8" />
				</View>
			) : comments.length === 0 ? (
				<View className="items-center py-8 px-6">
					<Text className="text-gray-500 text-center">
						No comments yet. Be the first to share your thoughts!
					</Text>
				</View>
			) : (
				<View>
					{comments.map((comment: any) => (
						<View key={comment.id} className="px-4 border-b border-gray-800/50">
							<CommentItem
								comment={comment}
								currentUserId={currentUserId}
								onReplyAdded={handleReplyAdded}
							/>
						</View>
					))}
					{hasMore && (
						<Pressable
							className="py-3 items-center"
							onPress={() => setCursor(data?.nextCursor ?? undefined)}
							accessibilityRole="button"
							accessibilityLabel="Load more comments"
						>
							<Text className="text-indigo-400 text-sm font-medium">
								Load more comments
							</Text>
						</Pressable>
					)}
				</View>
			)}
		</View>
	);
}
