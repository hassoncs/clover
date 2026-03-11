import Constants from "expo-constants";
import { Platform } from "react-native";

const DEV_API_URL = "http://api.slopcade.localhost:1355";

function getApiUrl(): string {
	if (process.env.EXPO_PUBLIC_API_URL) {
		return process.env.EXPO_PUBLIC_API_URL;
	}

	if (__DEV__) {
		if (Platform.OS === "web") {
			return DEV_API_URL;
		}

		const debuggerHost =
			Constants?.expoConfig?.hostUri ||
			(Constants?.manifest as any)?.debuggerHost ||
			(Constants?.manifest2 as any)?.extra?.expoGo?.debuggerHost;

		if (debuggerHost) {
			const host = debuggerHost.split(":")[0];
			if (host === "127.0.0.1" || host === "localhost") {
				return DEV_API_URL;
			}
			return `http://${host}:1355`;
		}

		return DEV_API_URL;
	}

	return "https://api.slopcade.com";
}

export const env = {
	apiUrl: getApiUrl(),
};
