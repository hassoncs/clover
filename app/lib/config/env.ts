import { Platform } from "react-native";
import Constants from "expo-constants";

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

    console.log("[Config] Debugger Host:", debuggerHost);

    if (debuggerHost) {
      const host = debuggerHost.split(":")[0];
      const url = `http://${host}:8789`;
      console.log("[Config] API URL detected from debugger host:", url);
      return url;
    }
  }

  console.log("[Config] API URL falling back to localhost");
  return "http://localhost:8789";
}

export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  apiUrl: getApiUrl(),
};

export function resolveAssetUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('data:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/assets/')) {
    return `${env.apiUrl}${url}`;
  }
  return `${env.apiUrl}/assets/${url}`;
}
