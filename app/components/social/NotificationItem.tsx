import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    actorId: string;
    actorName: string | null;
    actorAvatarUrl: string | null;
    targetType: string | null;
    targetId: string | null;
    gameId: string | null;
    message: string | null;
    isRead: boolean;
    createdAt: number;
  };
  onPress: () => void;
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

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

function getTypeIcon(type: string): { name: IoniconsName; color: string } {
  switch (type) {
    case "like":
      return { name: "heart", color: "#EF4444" };
    case "comment":
      return { name: "chatbubble", color: "#3B82F6" };
    case "reply":
      return { name: "chatbubble", color: "#3B82F6" };
    case "follow":
      return { name: "person-add", color: "#8B5CF6" };
    case "rating":
      return { name: "star", color: "#F59E0B" };
    default:
      return { name: "notifications", color: "#9CA3AF" };
  }
}

export function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const icon = getTypeIcon(notification.type);

  return (
    <Pressable
      className="flex-row items-center px-4 py-3"
      onPress={onPress}
    >
      {!notification.isRead && (
        <View className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
      )}
      {notification.isRead && <View className="w-2 mr-2" />}

      <View
        className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${getAvatarColor(notification.actorId)}`}
      >
        <Text className="text-white font-bold text-sm">
          {getInitials(notification.actorName)}
        </Text>
      </View>

      <View className="flex-1 mr-3">
        <Text className="text-gray-200 text-sm leading-5">
          {notification.message}
        </Text>
        <Text className="text-gray-500 text-xs mt-1">
          {timeAgo(notification.createdAt)}
        </Text>
      </View>

      <Ionicons name={icon.name} size={18} color={icon.color} />
    </Pressable>
  );
}
