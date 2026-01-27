import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useNavigation } from "expo-router";
import type { ReactNode } from "react";

interface FullScreenHeaderProps {
  onBack?: () => void;
  title?: string;
  centerContent?: ReactNode;
  rightContent?: ReactNode;
  showBackground?: boolean;
  fallbackRoute?: string;
}

export function FullScreenHeader({
  onBack,
  title,
  centerContent,
  rightContent,
  showBackground = false,
  fallbackRoute = "/lab",
}: FullScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      router.back();
    } else if (onBack) {
      // If custom onBack provided and no history, try onBack first
      // (preserves custom behavior for cases that handle it)
      onBack();
    } else {
      // No history and no custom handler, go to fallback
      router.replace(fallbackRoute as any);
    }
  };

  return (
    <View
      className={`absolute top-0 left-0 right-0 z-10 ${showBackground ? "bg-black/30" : ""}`}
      style={{ paddingTop: insets.top + 4 }}
      pointerEvents="box-none"
    >
      <View className="flex-row items-center justify-between px-3 pb-1" pointerEvents="box-none">
        <Pressable
          className="py-1.5 px-3 bg-black/40 rounded-lg backdrop-blur-sm"
          onPress={handleBack}
        >
          <Text className="text-white font-medium text-sm">Back</Text>
        </Pressable>

        {centerContent ?? (
          title ? (
            <Text className="text-white font-bold text-base flex-1 text-center mx-2" numberOfLines={1}>
              {title}
            </Text>
          ) : (
            <View className="flex-1" />
          )
        )}

        {rightContent ?? <View className="w-14" />}
      </View>
    </View>
  );
}
