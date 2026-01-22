import { Tabs } from "expo-router";
import { View, Text } from "react-native";

function TabIcon({ name }: { name: string }) {
  const icons: Record<string, string> = {
    lab: "🔬",
    maker: "🎮",
    gallery: "🎨",
    browse: "🔍",
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
          height: 85,
          paddingBottom: 30,
          paddingTop: 10,
        },
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
        name="gallery"
        options={{
          title: "Gallery",
          tabBarIcon: () => <TabIcon name="gallery" />,
          headerTitle: "Engine Gallery",
          headerStyle: {
            backgroundColor: "#0a0a0a",
          },
        }}
      />
    </Tabs>
  );
}
