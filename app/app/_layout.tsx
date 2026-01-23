import "react-native-get-random-values";
import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { TRPCProvider } from "@/lib/trpc/react";
import { handleNativeAuthCallback } from "@/lib/supabase/auth";
import "../global.css";

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

export default function RootLayout() {
  useDeepLinkHandler();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TRPCProvider>
        <SafeAreaProvider>
          <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="play/[id]"
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
        }}
      />
      <Stack.Screen
        name="play/preview"
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
        }}
      />
      <Stack.Screen
        name="test-games/[id]"
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
        }}
      />
      <Stack.Screen name="examples/box2d" options={{ title: "Box2D Demo" }} />
      <Stack.Screen name="examples/pendulum" options={{ title: "Pendulum" }} />
      <Stack.Screen name="examples/interaction" options={{ title: "Interaction" }} />
      <Stack.Screen name="examples/bridge" options={{ title: "Bridge" }} />
      <Stack.Screen name="examples/car" options={{ title: "Car" }} />
      <Stack.Screen name="examples/avalanche" options={{ title: "Avalanche" }} />
      <Stack.Screen name="examples/newtons_cradle" options={{ title: "Newton's Cradle" }} />
      <Stack.Screen name="examples/dominoes" options={{ title: "Dominoes" }} />
      <Stack.Screen name="examples/ragdoll" options={{ title: "Ragdoll Playground" }} />
      <Stack.Screen name="examples/rope_swing" options={{ title: "Rope Swing" }} />
      <Stack.Screen name="examples/pinball" options={{ title: "Pinball Table" }} />
      <Stack.Screen name="examples/liquid_illusion" options={{ title: "Liquid Illusion" }} />
      <Stack.Screen name="examples/slingshot" options={{ title: "Slingshot" }} />
      <Stack.Screen name="examples/magnet_playground" options={{ title: "Magnet Playground" }} />
      <Stack.Screen name="examples/top_down_asteroids" options={{ title: "Top-Down Asteroids" }} />
      <Stack.Screen name="examples/destructible_tower" options={{ title: "Destructible Tower" }} />
          </Stack>
        </SafeAreaProvider>
      </TRPCProvider>
    </GestureHandlerRootView>
  );
}
