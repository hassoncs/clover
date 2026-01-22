import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ReactNode } from "react";

interface FullScreenHeaderProps {
  onBack: () => void;
  title?: string;
  centerContent?: ReactNode;
  rightContent?: ReactNode;
  showBackground?: boolean;
}

export function FullScreenHeader({
  onBack,
  title,
  centerContent,
  rightContent,
  showBackground = false,
}: FullScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={`absolute top-0 left-0 right-0 z-10 ${showBackground ? "bg-black/30" : ""}`}
      style={{ paddingTop: insets.top + 8 }}
    >
      <View className="flex-row items-center justify-between px-4 pb-2">
        <Pressable
          className="py-2 px-4 bg-black/50 rounded-lg"
          onPress={onBack}
        >
          <Text className="text-white font-semibold">← Back</Text>
        </Pressable>

        {centerContent ?? (
          title ? (
            <Text className="text-white font-bold text-lg flex-1 text-center mx-2" numberOfLines={1}>
              {title}
            </Text>
          ) : (
            <View className="flex-1" />
          )
        )}

        {rightContent ?? <View className="w-16" />}
      </View>
    </View>
  );
}
