import { View } from "react-native";
import { Stack } from "expo-router";
import { WithSkia } from "../../components/WithSkia";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Interaction",
  description: "Touch to spawn and move objects.",
};

export default function InteractionExample() {
  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a2e" }}>
      <Stack.Screen options={{ title: "Interaction" }} />
      <WithSkia
        getComponent={() => import("../../components/examples/Interaction")}
      />
    </View>
  );
}
