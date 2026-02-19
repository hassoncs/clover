import { Pressable, Text, TextInput, View } from "react-native";

interface ThemeFilterBarProps {
	searchQuery: string;
	onSearchChange: (query: string) => void;
}

export function ThemeFilterBar({
	searchQuery,
	onSearchChange,
}: ThemeFilterBarProps) {
	return (
		<View className="mb-4">
			<View className="flex-row items-center bg-theme-surface rounded-xl px-4 py-3 border border-theme-border">
				<Text className="text-theme-text-secondary mr-3">🔍</Text>
				<TextInput
					className="flex-1 text-theme-text text-base"
					placeholder="Search themes..."
					placeholderTextColor="#A89B7D"
					value={searchQuery}
					onChangeText={onSearchChange}
					autoCapitalize="none"
					autoCorrect={false}
					accessibilityLabel="Search themes"
				/>
				{searchQuery.length > 0 && (
					<Pressable
						onPress={() => onSearchChange("")}
						accessibilityRole="button"
						accessibilityLabel="Clear search"
					>
						<Text className="text-theme-text-secondary text-lg">✕</Text>
					</Pressable>
				)}
			</View>
		</View>
	);
}
