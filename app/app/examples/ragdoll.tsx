import { View } from "react-native";
import { Stack } from "expo-router";
import { WithSkia } from "../../components/WithSkia";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Ragdoll Playground",
  description: "Complex revolute joints with limits and mass distribution.",
};

export default function RagdollExample() {
  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a2e" }}>
      <Stack.Screen options={{ title: "Ragdoll Playground" }} />
      <WithSkia
        getComponent={() => import("../../components/examples/Ragdoll")}
      />
    </View>
  );
}
