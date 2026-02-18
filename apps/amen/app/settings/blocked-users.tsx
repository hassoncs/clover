import { useState } from "react";
import { View, Text, Pressable, FlatList, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { trpcReact } from "@/lib/trpc/react";

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

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface BlockedUser {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  blockedAt: number;
}

export default function BlockedUsersScreen() {
  const router = useRouter();
  const utils = trpcReact.useUtils();
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const { data, isLoading } = trpcReact.moderation.listBlocked.useQuery({
    limit: 50,
    offset: 0,
  });

  const unblockMutation = trpcReact.moderation.unblock.useMutation({
    onSuccess: () => {
      setUnblockingId(null);
      utils.moderation.listBlocked.invalidate();
    },
    onError: () => {
      setUnblockingId(null);
    },
  });

  const handleUnblock = (userId: string) => {
    setUnblockingId(userId);
    unblockMutation.mutate({ userId });
  };

  const renderItem = ({ item }: { item: BlockedUser }) => (
    <View className="flex-row items-center px-4 py-3 border-b border-gray-800">
      <View
        className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${getAvatarColor(item.id)}`}
      >
        <Text className="text-white font-bold text-sm">
          {getInitials(item.displayName)}
        </Text>
      </View>

      <View className="flex-1">
        <Text className="text-white font-medium text-sm">
          {item.displayName ?? "Anonymous"}
        </Text>
      </View>

      <Pressable
        onPress={() => handleUnblock(item.id)}
        disabled={unblockingId === item.id}
        className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700"
      >
        {unblockingId === item.id ? (
          <ActivityIndicator size="small" color="#9CA3AF" />
        ) : (
          <Text className="text-gray-300 text-sm font-medium">Unblock</Text>
        )}
      </Pressable>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-900">
      <Stack.Screen
        options={{
          title: "Blocked Users",
          headerStyle: { backgroundColor: "#111827" },
          headerTintColor: "#FFFFFF",
          headerLeft: () => (
            <Pressable onPress={() => router.back()} className="mr-4">
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </Pressable>
          ),
        }}
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#818CF8" />
        </View>
      ) : !data?.blocked.length ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="people-outline" size={48} color="#4B5563" />
          <Text className="text-gray-400 text-base mt-4 text-center">
            You haven't blocked anyone
          </Text>
          <Text className="text-gray-600 text-sm mt-2 text-center">
            Blocked users won't be able to interact with you.
          </Text>
        </View>
      ) : (
        <FlatList
          data={data.blocked}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}
