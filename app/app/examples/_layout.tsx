import { Stack } from "expo-router";

export default function ExamplesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#1a1a2e",
        },
        headerTintColor: "#fff",
        contentStyle: {
          backgroundColor: "#1a1a2e",
        },
      }}
    />
  );
}
