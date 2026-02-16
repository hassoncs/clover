import { Redirect } from "expo-router";
import { Platform } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { activeBrandId } from "@/lib/brand";

export default function Index() {
	const { isAuthenticated, isLoading } = useAuth();

	if (
		Platform.OS === "web" &&
		activeBrandId === "amen" &&
		!isLoading &&
		!isAuthenticated
	) {
		return <Redirect href="/landing" />;
	}

	const home = Platform.OS === "web" ? "/(tabs)/browse" : "/(tabs)/feed";
	return <Redirect href={home} />;
}
