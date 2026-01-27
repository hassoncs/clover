import { Platform } from "react-native";
import { Redirect, Stack } from "expo-router";

export default function AdminLayout() {
  if (Platform.OS !== "web") {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#09090b" },
      }}
    />
  );
}
