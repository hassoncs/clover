import { View } from "react-native";
import { Stack } from "expo-router";
import { WithSkia } from "../../components/WithSkia";

export default function InteractionV2Example() {
  return (
    <View style={{ flex: 1, backgroundColor: "#1a1a2e" }}>
      <Stack.Screen options={{ title: "Interaction (Physics2D)" }} />
      <WithSkia
        getComponent={() => import("../../components/examples/InteractionV2")}
      />
    </View>
  );
}
