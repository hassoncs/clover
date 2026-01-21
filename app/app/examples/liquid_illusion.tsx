import { View } from "react-native";
import { Stack } from "expo-router";
import { WithSkia } from "../../components/WithSkia";
import type { ExampleMeta } from "../../lib/registry/types";

export const metadata: ExampleMeta = {
  title: "Liquid Illusion",
  description: "200+ particles simulating fluid with gravity tilting.",
};

export default function LiquidIllusionExample() {
  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a2e" }}>
      <Stack.Screen options={{ title: "Liquid Illusion" }} />
      <WithSkia
        getComponent={() => import("../../components/examples/LiquidIllusion")}
      />
    </View>
  );
}
