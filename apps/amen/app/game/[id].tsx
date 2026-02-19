import { Redirect, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";

/**
 * Redirect from old /game/[id] route to /play/[id]
 * This maintains backward compatibility for any bookmarks or links.
 */
export default function GameRedirect() {
	const { id, remixId } = useLocalSearchParams<{
		id: string;
		remixId?: string;
	}>();

	if (id) {
		const params: Record<string, string> = { id };
		if (remixId) params.remixId = remixId;
		return <Redirect href={{ pathname: "/play/[id]", params }} />;
	}

	return (
		<View className="flex-1 bg-theme-background items-center justify-center">
			<ActivityIndicator size="large" color="#C9A84C" />
		</View>
	);
}
