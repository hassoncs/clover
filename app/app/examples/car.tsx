import { View } from "react-native";
import { Stack } from "expo-router";
import { WithSkia } from "../../components/WithSkia";

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
