import Constants from "expo-constants";
import { Platform } from "react-native";

function getApiUrl(): string {
	if (process.env.EXPO_PUBLIC_API_URL) {
		return process.env.EXPO_PUBLIC_API_URL;
	}

	if (Platform.OS === "web") {
		return "http://localhost:8789";
	}

	if (__DEV__) {
		const debuggerHost =
			Constants?.expoConfig?.hostUri ||
			(Constants?.manifest as any)?.debuggerHost ||
			(Constants?.manifest2 as any)?.extra?.expoGo?.debuggerHost;

		if (debuggerHost) {
			const host = debuggerHost.split(":")[0];
			return `http://${host}:8789`;
		}
	}

	// Production fallback for real device builds
	return "https://api.slopcade.com";
}

export const env = {
	supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
	supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
	apiUrl: getApiUrl(),
	assetCdnUrl: `${getApiUrl()}/assets`,
	/** When true, bundled games are copied to offline storage on startup (native only) */
	embedGames: process.env.EXPO_PUBLIC_EMBED_GAMES === "true",
	stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
};

const ASSET_CDN_URL = env.assetCdnUrl;

export function resolveAssetUrl(
	url: string | undefined | null,
): string | undefined {
	if (!url) return undefined;
	if (url.startsWith("data:")) return url;
	if (url.startsWith("http://") || url.startsWith("https://")) return url;
	if (url.startsWith("/assets/")) {
		return `${ASSET_CDN_URL}${url.slice("/assets".length)}`;
	}
	return `${ASSET_CDN_URL}/${url}`;
}
