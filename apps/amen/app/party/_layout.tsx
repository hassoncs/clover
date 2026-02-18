import { Stack } from "expo-router";
import { View } from "react-native";

export default function PartyLayout() {
	return (
		<View className="flex-1 bg-theme-background">
			<Stack
				screenOptions={{
					headerShown: false,
					contentStyle: { backgroundColor: "transparent" },
				}}
			/>
		</View>
	);
}
