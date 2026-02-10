import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";

/**
 * Redirect from old /game/[id] route to /play/[id]
 * This maintains backward compatibility for any bookmarks or links.
 */
export default function GameRedirect() {
  const router = useRouter();
  const { id, packId } = useLocalSearchParams<{ id: string; packId?: string }>();

  useEffect(() => {
    if (id) {
      const params: Record<string, string> = { id };
      if (packId) params.packId = packId;
      router.replace({ pathname: "/play/[id]", params });
    }
  }, [id, packId, router]);

  return (
    <View className="flex-1 bg-gray-900 items-center justify-center">
      <ActivityIndicator size="large" color="#4CAF50" />
    </View>
  );
}
