import { View } from "react-native";
import { Stack } from "expo-router";
import { WithSkia } from "../../components/WithSkia";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Top-Down Asteroids",
  description: "Zero gravity, angular impulse, and screen wrapping.",
};

export default function TopDownAsteroidsExample() {
  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a2e" }}>
      <Stack.Screen options={{ title: "Top-Down Asteroids" }} />
      <WithSkia
        getComponent={() => import("../../components/examples/TopDownAsteroids")}
      />
    </View>
  );
}
