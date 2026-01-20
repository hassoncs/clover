import { View } from "react-native";
import { Stack } from "expo-router";
import { WithSkia } from "../../components/WithSkia";

export default function Box2DV2Example() {
  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a2e" }}>
      <Stack.Screen options={{ title: "Falling Boxes (Physics2D)" }} />
      <WithSkia
        getComponent={() => import("../../components/examples/FallingBoxesV2")}
      />
    </View>
  );
}
