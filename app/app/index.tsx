import { Platform } from "react-native";
import { Redirect } from "expo-router";

export default function Index() {
  const home = Platform.OS === "web" ? "/(tabs)/browse" : "/(tabs)/feed";
  return <Redirect href={home} />;
}
