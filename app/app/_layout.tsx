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
import { AnimatedSplashScreen } from "@/components/AnimatedSplashScreen";
import { needsInstallation, installEmbeddedGames } from "@/lib/offline/embedded-games";
import "../global.css";

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const SENTRY_ENABLED = !!SENTRY_DSN && !__DEV__;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    debug: __DEV__,
    enabled: SENTRY_ENABLED,
    enableNative: SENTRY_ENABLED,
    tracesSampleRate: __DEV__ ? 0 : 0.2,
  });
}

if (typeof window !== "undefined" && typeof global === "undefined") {
  (globalThis as any).global = globalThis;
}

function useEmbeddedGamesInstaller() {
  useEffect(() => {
    async function install() {
      try {
        if (await needsInstallation()) {
          console.log("[EmbeddedGames] Starting installation...");
          await installEmbeddedGames();
        }
      } catch (error) {
        console.error("[EmbeddedGames] Installation failed:", error);
      }
    }
    install();
  }, []);
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

function RootLayoutContent() {
  useDeepLinkHandler();
  useEmbeddedGamesInstaller();
  return (
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
        name="game/[id]"
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
  );
}

function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }} className={Platform.OS === "web" ? "no-select" : ""}>
      <TRPCProvider>
        <SafeAreaProvider>
          <AnimatedSplashScreen>
            <RootLayoutContent />
          </AnimatedSplashScreen>
        </SafeAreaProvider>
      </TRPCProvider>
    </GestureHandlerRootView>
  );
}

export default SENTRY_DSN ? Sentry.wrap(RootLayout) : RootLayout;
