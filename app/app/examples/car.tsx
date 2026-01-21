import { View } from "react-native";
import { Stack } from "expo-router";
import { WithSkia } from "../../components/WithSkia";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Car",
  description: "Vehicle with motors and terrain.",
};

export default function Example() {
  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a2e" }}>
      <Stack.Screen options={{ title: "Car" }} />
      <WithSkia
        getComponent={() => import("../../components/examples/Car")}
      />
    </View>
  );
}
