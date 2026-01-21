import { View } from "react-native";
import { Stack } from "expo-router";
import { WithSkia } from "../../components/WithSkia";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Pinball Table",
  description: "High restitution, kinematic flippers, and collision scoring.",
};

export default function PinballExample() {
  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a2e" }}>
      <Stack.Screen options={{ title: "Pinball Table" }} />
      <WithSkia
        getComponent={() => import("../../components/examples/Pinball")}
      />
    </View>
  );
}
// test comment
// test
