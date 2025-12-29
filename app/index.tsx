import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { WithSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

export default function Page() {
  return (
    <View className="flex-1 items-center justify-center">
      <View className="absolute inset-0">
        <WithSkiaWeb
          getComponent={() => import("../components/iridescence")}
          fallback={<ActivityIndicator />}
        />
      </View>
      <Text className="text-3xl font-bold italic">Welcome to Expo</Text>
    </View>
  );
}
