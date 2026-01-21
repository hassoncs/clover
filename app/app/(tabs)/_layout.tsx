import { Tabs } from "expo-router";
import { View, Text } from "react-native";

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    create: "✨",
    library: "📚",
    demos: "🔬",
    "test-games": "🎮",
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
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#eee",
          height: 85,
          paddingBottom: 30,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        headerStyle: {
          backgroundColor: "#fff",
        },
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarIcon: ({ focused }) => <TabIcon name="create" focused={focused} />,
          headerTitle: "Create Game",
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ focused }) => <TabIcon name="library" focused={focused} />,
          headerTitle: "My Games",
        }}
      />
      <Tabs.Screen
        name="demos"
        options={{
          title: "Examples",
          tabBarIcon: ({ focused }) => <TabIcon name="demos" focused={focused} />,
          headerTitle: "Physics Examples",
        }}
      />
      <Tabs.Screen
        name="test-games"
        options={{
          title: "Games",
          tabBarIcon: ({ focused }) => <TabIcon name="test-games" focused={focused} />,
          headerTitle: "Games",
        }}
      />
    </Tabs>
  );
}
