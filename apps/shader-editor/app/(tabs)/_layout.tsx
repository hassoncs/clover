import { Tabs } from "expo-router";
import { View } from "react-native";

export default function TabLayout() {
	return (
		<View style={{ flex: 1 }} className="bg-theme-background">
			<Tabs
				tabBar={() => null}
				screenOptions={{
					headerShown: false,
					sceneStyle: { backgroundColor: "transparent" },
				}}
			>
				<Tabs.Screen name="feed" options={{ title: "Feed" }} />
				<Tabs.Screen name="browse" options={{ title: "Browse" }} />
				<Tabs.Screen name="maker" options={{ title: "Maker" }} />
				<Tabs.Screen name="profile" options={{ title: "Profile" }} />
			</Tabs>
		</View>
	);
}
