import { View } from "react-native";
import { Stack } from "expo-router";
import { WithSkia } from "../../components/WithSkia";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Newton's Cradle",
  description: "Restitution and momentum conservation.",
};

export default function Example() {
  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a2e" }}>
      <Stack.Screen options={{ title: "Newtons Cradle" }} />
      <WithSkia
        getComponent={() => import("../../components/examples/NewtonsCradle")}
      />
    </View>
  );
}
