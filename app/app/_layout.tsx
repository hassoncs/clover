import "react-native-get-random-values";
import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import * as Sentry from "@sentry/react-native";
import { TRPCProvider } from "@/lib/trpc/react";
import { handleNativeAuthCallback } from "@/lib/supabase/auth";
import "../global.css";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: __DEV__,
  enabled: !__DEV__,
  enableNative: true,
  tracesSampleRate: __DEV__ ? 0 : 0.2,
});

if (typeof window !== "undefined" && typeof global === "undefined") {
  (globalThis as any).global = globalThis;
}

function useDeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === "web") return;

    async function handleUrl(url: string) {
      try {
        const handled = await handleNativeAuthCallback(url);
        if (handled) {
          router.replace("/maker");
        }
      } catch (error) {
        console.error("Deep link auth error:", error);
        router.replace("/");
      }
    }

    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);
}

function RootLayout() {
  useDeepLinkHandler();
  return (
    <GestureHandlerRootView style={{ flex: 1 }} className={Platform.OS === "web" ? "no-select" : ""}>
      <TRPCProvider>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="play/[id]"
              options={{
                presentation: "fullScreenModal",
              }}
            />
            <Stack.Screen
              name="play/preview"
              options={{
                presentation: "fullScreenModal",
              }}
            />
            <Stack.Screen
              name="test-games/[id]"
              options={{
                presentation: "fullScreenModal",
              }}
            />
            <Stack.Screen 
              name="examples/[id]" 
              options={{ 
                presentation: "fullScreenModal",
              }} 
            />
          </Stack>
        </SafeAreaProvider>
      </TRPCProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
