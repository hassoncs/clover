import { View } from "react-native";
import { Stack } from "expo-router";
import { WithSkia } from "../../components/WithSkia";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Magnet Playground",
  description: "Custom force application with attract/repel polarity.",
};

export default function MagnetPlaygroundExample() {
  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a2e" }}>
      <Stack.Screen options={{ title: "Magnet Playground" }} />
      <WithSkia
        getComponent={() => import("../../components/examples/MagnetPlayground")}
      />
    </View>
  );
}
