import { Tabs } from "expo-router";
import { Platform, View, Text } from "react-native";

function TabIcon({ name }: { name: string }) {
  const icons: Record<string, string> = {
    lab: "🔬",
    maker: "🎮",
    browse: "🔍",
    themes: "🎨",
  };

  return (
    <View className="items-center justify-center">
      <Text className="text-2xl">{icons[name] ?? "•"}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#4CAF50",
        tabBarInactiveTintColor: "#888",
        tabBarStyle: {
          backgroundColor: "#111",
          borderTopWidth: 1,
          borderTopColor: "#333",
          height: Platform.OS === "web" ? 75 : 85,
          paddingBottom: Platform.OS === "web" ? 0 : 30,
          paddingTop: 10,
        },
        ...(Platform.OS === "web" && {
          tabBarHideOnKeyboard: false,
          safeAreaInsets: { bottom: 0 },
        }),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        headerStyle: {
          backgroundColor: "#111",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Tabs.Screen
        name="lab"
        options={{
          title: "Lab",
          tabBarIcon: () => <TabIcon name="lab" />,
          headerTitle: "Physics Lab",
        }}
      />
      <Tabs.Screen
        name="maker"
        options={{
          title: "Maker",
          tabBarIcon: () => <TabIcon name="maker" />,
          headerTitle: "Game Maker",
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: "Browse",
          tabBarIcon: () => <TabIcon name="browse" />,
          headerTitle: "Discover Games",
        }}
      />
      <Tabs.Screen
        name="themes"
        options={{
          title: "Themes",
          tabBarIcon: () => <TabIcon name="themes" />,
          headerTitle: "Themes",
        }}
      />
    </Tabs>
  );
}
