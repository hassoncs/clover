import { View } from "react-native";
import { Stack } from "expo-router";
import { WithSkia } from "../../components/WithSkia";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Rope Swing",
  description: "Dynamic distance joints for spider-man style swinging.",
};

export default function RopeSwingExample() {
  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a2e" }}>
      <Stack.Screen options={{ title: "Rope Swing" }} />
      <WithSkia
        getComponent={() => import("../../components/examples/RopeSwing")}
      />
    </View>
  );
}
