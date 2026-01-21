import { View } from "react-native";
import { Stack } from "expo-router";
import { WithSkia } from "../../components/WithSkia";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Slingshot",
  description: "Drag-and-release mechanics with impulse physics.",
};

export default function SlingshotExample() {
  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a2e" }}>
      <Stack.Screen options={{ title: "Slingshot" }} />
      <WithSkia
        getComponent={() => import("../../components/examples/Slingshot")}
      />
    </View>
  );
}
