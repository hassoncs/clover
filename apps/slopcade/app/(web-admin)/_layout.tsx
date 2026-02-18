import { Stack } from "expo-router";
import { Platform, Text, View } from "react-native";
import { useAuth } from "@/hooks/useAuth";

export default function AdminLayout() {
	const { user, isLoading } = useAuth();

	if (Platform.OS !== "web") {
		return (
			<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
				<Text>Admin dashboard is web-only.</Text>
			</View>
		);
	}

	if (isLoading) {
		return (
			<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
				<Text>Loading...</Text>
			</View>
		);
	}

	if (!user) {
		return (
			<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
				<Text>Please sign in to access admin dashboard.</Text>
			</View>
		);
	}

	return (
		<Stack
			screenOptions={{
				headerShown: false,
			}}
		/>
	);
}
