import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FeedScreen() {
	return (
		<SafeAreaView className="flex-1 bg-theme-background">
			<View className="px-4 py-3 border-b border-theme-border">
				<Text className="text-theme-text text-lg font-semibold">Feed</Text>
				<Text className="text-theme-text-secondary text-sm">
					Discover shader effects
				</Text>
			</View>
			<View className="flex-1 items-center justify-center">
				<Text className="text-5xl mb-4">✨</Text>
				<Text className="text-theme-text text-xl font-semibold">
					Shader Feed
				</Text>
				<Text className="text-theme-text-secondary text-center mt-2 px-8">
					Coming soon — browse community shader effects
				</Text>
			</View>
		</SafeAreaView>
	);
}
