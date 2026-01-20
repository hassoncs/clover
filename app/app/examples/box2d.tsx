import { View } from "react-native";
import { Stack } from "expo-router";
import { WithSkia } from "../../components/WithSkia";

export default function Box2DExample() {
  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a2e" }}>
      <Stack.Screen options={{ title: "Falling Boxes" }} />
      <WithSkia
        getComponent={() => import("../../components/examples/FallingBoxes")}
      />
    </View>
  );
}
