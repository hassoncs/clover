import { Redirect } from "expo-router";
import { Platform } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { activeBrand, activeBrandId } from "@/lib/brand";

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

	const defaultToFeed =
		Platform.OS !== "web" && activeBrand.features.socialFeed;
	const home = defaultToFeed ? "/(tabs)/feed" : "/(tabs)/browse";
	return <Redirect href={home} />;
}
