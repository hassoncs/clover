import { View, Text, TextInput, Pressable } from 'react-native';

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
      <View className="flex-row items-center bg-gray-800 rounded-xl px-4 py-3 border border-gray-700">
        <Text className="text-gray-400 mr-3">🔍</Text>
        <TextInput
          className="flex-1 text-white text-base"
          placeholder="Search themes..."
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={onSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search themes"
        />
        {searchQuery.length > 0 && (
          <Pressable 
            onPress={() => onSearchChange('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Text className="text-gray-400 text-lg">✕</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
