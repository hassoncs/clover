import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { trpcReact } from "@/lib/trpc/react";
import { useAuth } from "@/hooks/useAuth";
import { NotificationItem } from "@/components/social/NotificationItem";

export default function NotificationsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const utils = trpcReact.useUtils();
  const [refreshing, setRefreshing] = useState(false);

  const notificationsQuery = trpcReact.notifications.list.useQuery(
    { limit: 20, offset: 0 },
    { enabled: isAuthenticated },
  );

  const markAsReadMutation = trpcReact.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const markAllAsReadMutation =
    trpcReact.notifications.markAllAsRead.useMutation({
      onSuccess: () => {
        utils.notifications.list.invalidate();
        utils.notifications.unreadCount.invalidate();
      },
    });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await utils.notifications.list.invalidate();
    setRefreshing(false);
  }, [utils]);

  const handleNotificationPress = useCallback(
    (notification: {
      id: string;
      type: string;
      actorId: string;
      gameId: string | null;
      isRead: boolean;
    }) => {
      if (!notification.isRead) {
        markAsReadMutation.mutate({ notificationIds: [notification.id] });
      }

      switch (notification.type) {
        case "like":
        case "comment":
        case "reply":
        case "rating":
          if (notification.gameId) {
            router.push(`/game-detail/${notification.gameId}`);
          }
          break;
        case "follow":
          router.push(`/user/${notification.actorId}`);
          break;
      }
    },
    [router, markAsReadMutation],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900">
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="notifications-outline" size={48} color="#6B7280" />
          <Text className="text-gray-400 text-base mt-4 text-center">
            Sign in to see your notifications
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const notifications = notificationsQuery.data?.notifications ?? [];
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <SafeAreaView className="flex-1 bg-gray-900">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-800">
        <Pressable onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>

        <Text className="text-white text-lg font-semibold">Notifications</Text>

        <Pressable
          onPress={handleMarkAllRead}
          disabled={!hasUnread || markAllAsReadMutation.isPending}
          className="p-1"
        >
          <Text
            className={
              hasUnread && !markAllAsReadMutation.isPending
                ? "text-indigo-400 text-sm font-medium"
                : "text-gray-600 text-sm font-medium"
            }
          >
            Mark all read
          </Text>
        </Pressable>
      </View>

      {notificationsQuery.isLoading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#818CF8" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem
              notification={item}
              onPress={() => handleNotificationPress(item)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#818CF8"
            />
          }
          ItemSeparatorComponent={() => (
            <View className="h-px bg-gray-800 ml-16" />
          )}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-24">
              <Ionicons
                name="notifications-outline"
                size={48}
                color="#6B7280"
              />
              <Text className="text-gray-400 text-base mt-4">
                No notifications yet
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
