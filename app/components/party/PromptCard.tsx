import { Text, View } from "react-native";

export function PromptCard({ text }: { text: string }) {
	return (
		<View className="w-full bg-theme-surface p-6 rounded-2xl border border-theme-border shadow-sm mb-6">
			<Text className="text-2xl font-bold text-theme-text text-center leading-tight">
				{text}
			</Text>
		</View>
	);
}
