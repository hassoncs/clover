import { View, Text, Pressable, ScrollView, ActivityIndicator, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { trpcReact } from "@/lib/trpc/react";
import { useAuth } from "@/hooks/useAuth";
import { FollowButton } from "@/components/social/FollowButton";

const AVATAR_COLORS = ["bg-indigo-600", "bg-emerald-600", "bg-amber-600", "bg-rose-600", "bg-cyan-600", "bg-violet-600"];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash << 5) - hash + id.charCodeAt(i);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;

  const { data: profile, isLoading } = trpcReact.social.getUserProfile.useQuery(
    { userId: id! },
    { enabled: !!id },
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#818CF8" />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center">
        <Text className="text-gray-400 text-lg">User not found</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="text-indigo-400 font-semibold">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-900">
      <View className="flex-row items-center px-4 py-3 border-b border-gray-800">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#E4E4E7" />
        </Pressable>
        <Text className="text-white font-semibold text-lg flex-1" numberOfLines={1}>
          {profile.displayName ?? "User"}
        </Text>
      </View>

      <ScrollView className="flex-1">
        <View className="items-center pt-6 pb-4">
          <View className={`w-20 h-20 rounded-full items-center justify-center ${getAvatarColor(profile.id)}`}>
            <Text className="text-white font-bold text-2xl">
              {getInitials(profile.displayName)}
            </Text>
          </View>
          <Text className="text-white font-bold text-xl mt-3">
            {profile.displayName ?? "Anonymous"}
          </Text>
          {profile.bio ? (
            <Text className="text-gray-400 text-sm mt-2 text-center px-8">
              {profile.bio}
            </Text>
          ) : null}
        </View>

        <View className="flex-row justify-center gap-8 py-4 border-y border-gray-800">
          <View className="items-center">
            <Text className="text-white font-bold text-lg">{formatCount(profile.gameCount)}</Text>
            <Text className="text-gray-500 text-xs mt-0.5">Games</Text>
          </View>
          <Pressable
            className="items-center"
            onPress={() =>
              router.push({
                pathname: "/user/followers",
                params: { userId: id!, tab: "followers" },
              })
            }
          >
            <Text className="text-white font-bold text-lg">{formatCount(profile.followerCount)}</Text>
            <Text className="text-gray-500 text-xs mt-0.5">Followers</Text>
          </Pressable>
          <Pressable
            className="items-center"
            onPress={() =>
              router.push({
                pathname: "/user/followers",
                params: { userId: id!, tab: "following" },
              })
            }
          >
            <Text className="text-white font-bold text-lg">{formatCount(profile.followingCount)}</Text>
            <Text className="text-gray-500 text-xs mt-0.5">Following</Text>
          </Pressable>
        </View>

        {id && currentUserId !== id && (
          <View className="px-4 py-4">
            <FollowButton
              targetUserId={id}
              currentUserId={currentUserId}
              initialIsFollowing={profile.isFollowing}
            />
          </View>
        )}

        <View className="px-4 pt-4">
          <Text className="text-white font-semibold text-base mb-3">Games</Text>
          {profile.games.length === 0 ? (
            <View className="items-center py-8">
              <Text className="text-gray-500">No public games yet</Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {profile.games.map((game) => (
                <Pressable
                  key={game.id}
                  className="bg-gray-800 rounded-lg overflow-hidden"
                  style={{ width: "48%" }}
                  onPress={() => router.push({ pathname: "/game-detail/[id]", params: { id: game.id } })}
                >
                  {game.thumbnailUrl ? (
                    <Image
                      source={{ uri: game.thumbnailUrl }}
                      className="w-full aspect-square"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-full aspect-square bg-gray-700 items-center justify-center">
                      <Text className="text-3xl">🎮</Text>
                    </View>
                  )}
                  <View className="p-2">
                    <Text className="text-white text-sm font-medium" numberOfLines={1}>
                      {game.title}
                    </Text>
                    <View className="flex-row items-center gap-2 mt-1">
                      {game.ratingCount > 0 && (
                        <View className="flex-row items-center gap-0.5">
                          <Ionicons name="star" size={10} color="#FBBF24" />
                          <Text className="text-gray-400 text-xs">{game.ratingAverage.toFixed(1)}</Text>
                        </View>
                      )}
                      <Text className="text-gray-500 text-xs">{formatCount(game.playCount)} plays</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
