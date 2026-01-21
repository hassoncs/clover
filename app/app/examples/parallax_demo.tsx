import { View } from "react-native";
import { Stack } from "expo-router";
import { WithSkia } from "../../components/WithSkia";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Parallax Background",
  description: "Multi-layer parallax with 4 themes and camera controls.",
};

export default function ParallaxDemoExample() {
  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a2e" }}>
      <Stack.Screen options={{ title: "Parallax Background Demo" }} />
      <WithSkia
        getComponent={() => import("../../components/examples/ParallaxDemo")}
      />
    </View>
  );
}
