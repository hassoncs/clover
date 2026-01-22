import Constants from "expo-constants";
import { Platform } from "react-native";
import { initTelemetry } from "@chriscode/devmux-telemetry";

const DEFAULT_PORT = 9876;

function getTelemetryServerUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_DEVMUX_TELEMETRY_URL;
  if (explicit) return explicit;

  if (Platform.OS === "web") {
    return `ws://localhost:${DEFAULT_PORT}`;
  }

  if (__DEV__) {
    const debuggerHost =
      Constants?.expoConfig?.hostUri ||
      (Constants?.manifest as unknown as { debuggerHost?: string })
        ?.debuggerHost ||
      (Constants?.manifest2 as unknown as { extra?: { expoGo?: { debuggerHost?: string } } })
        ?.extra?.expoGo?.debuggerHost;

    if (debuggerHost) {
      const host = debuggerHost.split(":")[0];
      return `ws://${host}:${DEFAULT_PORT}`;
    }
  }

  return `ws://localhost:${DEFAULT_PORT}`;
}

export function ensureDevMuxTelemetryInitialized(): void {
  if (!__DEV__) return;

  const globalForFlag = globalThis as unknown as {
    __slopcadeDevMuxTelemetryInitialized?: boolean;
  };

  if (globalForFlag.__slopcadeDevMuxTelemetryInitialized) return;
  globalForFlag.__slopcadeDevMuxTelemetryInitialized = true;

  initTelemetry({
    serviceName: "slopcade",
    serverUrl: getTelemetryServerUrl(),
  });
}
