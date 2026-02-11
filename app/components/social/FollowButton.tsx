import { Pressable, Text, ActivityIndicator } from "react-native";
import { trpcReact } from "@/lib/trpc/react";

interface FollowButtonProps {
  targetUserId: string;
  currentUserId: string | null;
  initialIsFollowing?: boolean;
  compact?: boolean;
}

export function FollowButton({ targetUserId, currentUserId, initialIsFollowing, compact }: FollowButtonProps) {
  const utils = trpcReact.useUtils();

  const followStatus = trpcReact.social.isFollowing.useQuery(
    { targetType: "user", targetIds: [targetUserId] },
    { enabled: !!currentUserId, initialData: initialIsFollowing != null ? { [targetUserId]: initialIsFollowing } : undefined }
  );

  const followMut = trpcReact.social.follow.useMutation({
    onSuccess: () => {
      utils.social.isFollowing.invalidate({ targetType: "user", targetIds: [targetUserId] });
      utils.social.getUserProfile.invalidate({ userId: targetUserId });
    },
  });

  const unfollowMut = trpcReact.social.unfollow.useMutation({
    onSuccess: () => {
      utils.social.isFollowing.invalidate({ targetType: "user", targetIds: [targetUserId] });
      utils.social.getUserProfile.invalidate({ userId: targetUserId });
    },
  });

  if (!currentUserId || currentUserId === targetUserId) return null;

  const isFollowing = followStatus.data?.[targetUserId] ?? false;
  const isPending = followMut.isPending || unfollowMut.isPending;

  const handlePress = () => {
    if (isPending) return;
    if (isFollowing) {
      unfollowMut.mutate({ targetType: "user", targetId: targetUserId });
    } else {
      followMut.mutate({ targetType: "user", targetId: targetUserId });
    }
  };

  if (compact) {
    return (
      <Pressable 
        onPress={handlePress} 
        disabled={isPending}
        accessibilityRole="button"
        accessibilityLabel={isFollowing ? "Unfollow" : "Follow"}
        accessibilityState={{ selected: isFollowing }}
      >
        {isPending ? (
          <ActivityIndicator size="small" color="#818CF8" />
        ) : (
          <Text className={`text-sm font-semibold ${isFollowing ? "text-gray-400" : "text-indigo-400"}`}>
            {isFollowing ? "Following" : "Follow"}
          </Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      className={`px-5 py-2 rounded-lg ${
        isFollowing ? "bg-gray-700 active:bg-gray-600" : "bg-indigo-600 active:bg-indigo-700"
      }`}
      onPress={handlePress}
      disabled={isPending}
      accessibilityRole="button"
      accessibilityLabel={isFollowing ? "Unfollow" : "Follow"}
      accessibilityState={{ selected: isFollowing }}
    >
      {isPending ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Text className="text-white font-semibold text-sm">
          {isFollowing ? "Following" : "Follow"}
        </Text>
      )}
    </Pressable>
  );
}
