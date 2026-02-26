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
				<Tabs.Screen name="browse" options={{ title: "Browse" }} />
				<Tabs.Screen name="profile" options={{ title: "Profile" }} />
				<Tabs.Screen name="chat" options={{ href: null }} />
			</Tabs>
		</View>
	);
}
