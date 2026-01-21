import { View } from "react-native";
import { Stack } from "expo-router";
import { WithSkia } from "../../components/WithSkia";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Bridge",
  description: "Chain of bodies connected by joints.",
};

export default function Example() {
  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a2e" }}>
      <Stack.Screen options={{ title: "Bridge" }} />
      <WithSkia
        getComponent={() => import("../../components/examples/Bridge")}
      />
    </View>
  );
}
