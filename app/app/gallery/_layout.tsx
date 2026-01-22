import { Stack } from "expo-router";

export default function GalleryLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#0a0a0a",
        },
        headerTintColor: "#fff",
        contentStyle: {
          backgroundColor: "#0a0a0a",
        },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Gallery" }} />
      <Stack.Screen name="[section]/index" options={{ title: "Section" }} />
      <Stack.Screen name="[section]/[id]" options={{ title: "Detail" }} />
    </Stack>
  );
}
