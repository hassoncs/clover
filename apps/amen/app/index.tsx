import { Redirect } from "expo-router";
import { Platform } from "react-native";
import { useAuth } from "@/hooks/useAuth";

export default function Index() {
	const { isAuthenticated, isLoading } = useAuth();

	if (Platform.OS === "web" && !isLoading && !isAuthenticated) {
		return <Redirect href="/landing" />;
	}

	const home = "/(tabs)/browse";
	return <Redirect href={home} />;
}
