import { View } from "react-native";
import { Stack } from "expo-router";
import { WithSkia } from "../../components/WithSkia";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Destructible Tower",
  description: "Runtime body destruction and debris spawning.",
};

export default function DestructibleTowerExample() {
  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a2e" }}>
      <Stack.Screen options={{ title: "Destructible Tower" }} />
      <WithSkia
        getComponent={() => import("../../components/examples/DestructibleTower")}
      />
    </View>
  );
}
