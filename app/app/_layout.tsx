import { Stack } from "expo-router";
import "../global.css";

if (typeof window !== "undefined" && typeof global === "undefined") {
  (globalThis as any).global = globalThis;
}

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="play/[id]"
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
        }}
      />
      <Stack.Screen
        name="play/preview"
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
        }}
      />
      <Stack.Screen
        name="test-games/[id]"
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
        }}
      />
      <Stack.Screen name="examples/box2d" options={{ title: "Box2D Demo" }} />
      <Stack.Screen name="examples/pendulum" options={{ title: "Pendulum" }} />
      <Stack.Screen name="examples/interaction" options={{ title: "Interaction" }} />
      <Stack.Screen name="examples/bridge" options={{ title: "Bridge" }} />
      <Stack.Screen name="examples/car" options={{ title: "Car" }} />
      <Stack.Screen name="examples/avalanche" options={{ title: "Avalanche" }} />
      <Stack.Screen name="examples/newtons_cradle" options={{ title: "Newton's Cradle" }} />
      <Stack.Screen name="examples/dominoes" options={{ title: "Dominoes" }} />
    </Stack>
  );
}
