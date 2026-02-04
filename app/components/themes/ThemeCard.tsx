import { View, Text, Pressable, Image } from 'react-native';

interface ThemeCardProps {
  id: string;
  name: string;
  promptModifier: string;
  isPublic: boolean;
  isOwned: boolean;
  thumbnailUrl?: string | null;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ThemeCard({
  name,
  promptModifier,
  isPublic,
  isOwned,
  thumbnailUrl,
  onPress,
  onEdit,
  onDelete,
}: ThemeCardProps) {
  return (
    <Pressable
      className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-3 active:bg-gray-700"
      onPress={onPress}
    >
      <View className="flex-row items-center">
        <View className="w-16 h-16 bg-indigo-900/30 rounded-lg items-center justify-center mr-4 overflow-hidden">
          {thumbnailUrl ? (
            <Image
              source={{ uri: thumbnailUrl }}
              className="w-full h-full"
              resizeMode="contain"
            />
          ) : (
            <Text className="text-3xl">🎨</Text>
          )}
        </View>

        <View className="flex-1">
          <View className="flex-row items-center flex-wrap">
            <Text className="text-lg font-semibold text-white mr-2">{name}</Text>
            
            {isPublic && (
              <View className="px-2 py-0.5 bg-green-900/60 rounded mr-2">
                <Text className="text-xs text-green-300">Public</Text>
              </View>
            )}
          </View>

          <Text className="text-gray-400 mt-1 text-sm" numberOfLines={2}>
            {promptModifier}
          </Text>
        </View>

        <Text className="text-gray-500 text-xl ml-2">→</Text>
      </View>

      {isOwned && (onEdit || onDelete) && (
        <View className="flex-row justify-end mt-3 pt-3 border-t border-gray-700">
          {onEdit && (
            <Pressable 
              onPress={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="px-3 py-1.5 bg-gray-700 rounded mr-2 active:bg-gray-600"
            >
              <Text className="text-xs text-white font-medium">Edit</Text>
            </Pressable>
          )}
          
          {onDelete && (
            <Pressable 
              onPress={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="px-3 py-1.5 bg-red-900/30 rounded active:bg-red-900/50"
            >
              <Text className="text-xs text-red-300 font-medium">Delete</Text>
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
}
