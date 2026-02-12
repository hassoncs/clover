import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

/**
 * Redirect from old /game/[id] route to /play/[id]
 * This maintains backward compatibility for any bookmarks or links.
 */
export default function GameRedirect() {
	const router = useRouter();
	const { id, remixId } = useLocalSearchParams<{
		id: string;
		remixId?: string;
	}>();

	useEffect(() => {
		if (id) {
			const params: Record<string, string> = { id };
			if (remixId) params.remixId = remixId;
			router.replace({ pathname: "/play/[id]", params });
		}
	}, [id, remixId, router]);

	return (
		<View className="flex-1 bg-gray-900 items-center justify-center">
			<ActivityIndicator size="large" color="#4CAF50" />
		</View>
	);
}
