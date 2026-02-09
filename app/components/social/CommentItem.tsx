import { useState } from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { trpcReact } from "@/lib/trpc/react";

interface CommentData {
  id: string;
  gameId: string;
  userId: string;
  parentId: string | null;
  body: string;
  depth: number;
  replyCount: number;
  reactionCount: number;
  isEdited: boolean;
  createdAt: number;
  author: {
    displayName: string | null;
    avatarUrl: string | null;
  };
  userReacted: boolean;
}

interface CommentItemProps {
  comment: CommentData;
  currentUserId: string | null;
  onReplyAdded: () => void;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
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

function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function CommentItem({ comment, currentUserId, onReplyAdded }: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");

  const utils = trpcReact.useUtils();

  const addReaction = trpcReact.social.addReaction.useMutation({
    onSuccess: () => {
      utils.social.listComments.invalidate({ gameId: comment.gameId });
    },
  });

  const removeReaction = trpcReact.social.removeReaction.useMutation({
    onSuccess: () => {
      utils.social.listComments.invalidate({ gameId: comment.gameId });
    },
  });

  const addComment = trpcReact.social.addComment.useMutation({
    onSuccess: () => {
      setReplyText("");
      setShowReplyInput(false);
      setShowReplies(true);
      utils.social.listComments.invalidate({ gameId: comment.gameId });
      onReplyAdded();
    },
  });

  const deleteComment = trpcReact.social.deleteComment.useMutation({
    onSuccess: () => {
      utils.social.listComments.invalidate({ gameId: comment.gameId });
      onReplyAdded();
    },
  });

  const replies = trpcReact.social.listComments.useQuery(
    { gameId: comment.gameId, parentId: comment.id },
    { enabled: showReplies && comment.replyCount > 0 }
  );

  const handleToggleLike = () => {
    if (!currentUserId) return;
    if (comment.userReacted) {
      removeReaction.mutate({ targetType: "comment", targetId: comment.id });
    } else {
      addReaction.mutate({ targetType: "comment", targetId: comment.id });
    }
  };

  const handleSubmitReply = () => {
    const trimmed = replyText.trim();
    if (!trimmed || !currentUserId) return;
    addComment.mutate({
      gameId: comment.gameId,
      body: trimmed,
      parentId: comment.id,
    });
  };

  const handleDelete = () => {
    deleteComment.mutate({ commentId: comment.id });
  };

  const isOwner = currentUserId === comment.userId;
  const depthPadding = comment.depth > 0 ? `ml-${Math.min(comment.depth * 8, 16)}` : "";

  return (
    <View className={depthPadding}>
      <View className="py-3">
        <View className="flex-row">
          <View
            className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${getAvatarColor(comment.userId)}`}
          >
            <Text className="text-white font-bold text-xs">
              {getInitials(comment.author.displayName)}
            </Text>
          </View>

          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <Text className="text-white font-semibold text-sm">
                {comment.author.displayName ?? "Anonymous"}
              </Text>
              <Text className="text-gray-500 text-xs ml-2">
                {timeAgo(comment.createdAt)}
              </Text>
              {comment.isEdited && (
                <Text className="text-gray-600 text-xs ml-1">(edited)</Text>
              )}
            </View>

            <Text className="text-gray-300 text-sm leading-5">
              {comment.body}
            </Text>

            <View className="flex-row items-center mt-2 gap-4">
              <Pressable
                className="flex-row items-center"
                onPress={handleToggleLike}
                disabled={!currentUserId}
              >
                <Ionicons
                  name={comment.userReacted ? "heart" : "heart-outline"}
                  size={16}
                  color={comment.userReacted ? "#EF4444" : "#9CA3AF"}
                />
                {comment.reactionCount > 0 && (
                  <Text
                    className={`text-xs ml-1 ${
                      comment.userReacted ? "text-red-400" : "text-gray-500"
                    }`}
                  >
                    {comment.reactionCount}
                  </Text>
                )}
              </Pressable>

              {comment.depth < 2 && (
                <Pressable
                  className="flex-row items-center"
                  onPress={() => setShowReplyInput(!showReplyInput)}
                >
                  <Ionicons name="chatbubble-outline" size={14} color="#9CA3AF" />
                  <Text className="text-gray-500 text-xs ml-1">Reply</Text>
                </Pressable>
              )}

              {isOwner && (
                <Pressable
                  className="flex-row items-center"
                  onPress={handleDelete}
                  disabled={deleteComment.isPending}
                >
                  <Ionicons name="trash-outline" size={14} color="#6B7280" />
                </Pressable>
              )}
            </View>

            {comment.replyCount > 0 && !showReplies && (
              <Pressable
                className="mt-2"
                onPress={() => setShowReplies(true)}
              >
                <Text className="text-indigo-400 text-xs font-medium">
                  View {comment.replyCount}{" "}
                  {comment.replyCount === 1 ? "reply" : "replies"}
                </Text>
              </Pressable>
            )}

            {showReplyInput && currentUserId && (
              <View className="mt-3 flex-row items-center">
                <TextInput
                  className="flex-1 bg-gray-800 px-3 py-2 rounded-lg text-white text-sm border border-gray-700"
                  placeholder="Write a reply..."
                  placeholderTextColor="#666"
                  value={replyText}
                  onChangeText={setReplyText}
                  multiline
                  maxLength={2000}
                />
                <Pressable
                  className="ml-2 p-2"
                  onPress={handleSubmitReply}
                  disabled={!replyText.trim() || addComment.isPending}
                >
                  {addComment.isPending ? (
                    <ActivityIndicator size="small" color="#818CF8" />
                  ) : (
                    <Ionicons
                      name="send"
                      size={18}
                      color={replyText.trim() ? "#818CF8" : "#4B5563"}
                    />
                  )}
                </Pressable>
              </View>
            )}

            {showReplies && replies.data?.comments && (
              <View className="mt-2">
                {replies.data.comments.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    currentUserId={currentUserId}
                    onReplyAdded={onReplyAdded}
                  />
                ))}
                {replies.isLoading && (
                  <ActivityIndicator size="small" color="#818CF8" className="py-2" />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
