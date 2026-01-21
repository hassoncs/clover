import { View } from "react-native";
import { Stack } from "expo-router";
import { WithSkia } from "../../components/WithSkia";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Pendulum (Joints)",
  description: "Revolute joints and chain physics.",
};

export default function PendulumExample() {
  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a2e" }}>
      <Stack.Screen options={{ title: "Pendulum" }} />
      <WithSkia
        getComponent={() => import("../../components/examples/Pendulum")}
      />
    </View>
  );
}
