---
title: "Plan telemetry integration"
agent: oracle
created: 2026-01-22T16:18:32.248Z
session_id: ses_419834d8affeB4ckbTHz0i7V5c
duration: 3m 41s
---

# Plan telemetry integration

**Bottom line**
- Add the DevMux telemetry client to the Expo app and initialize it once from `app/app/_layout.tsx` (dev-only), with a small helper that picks the right WebSocket URL for simulator vs physical devices.
- Add a `telemetry` service to `devmux.config.json` (bind to `0.0.0.0` so phones can connect) and enable DevMux “watch” so telemetry-server failures (and any other matched patterns you include) flow into the same queue file.

**Action plan**

1) Add the telemetry client dependency (Expo app)
- Modify: `app/package.json`
- Change: add dependency
- Recommended command (from repo root):
  ```bash
  pnpm --filter slopcade add @chriscode/devmux-telemetry
  ```
- Expected `app/package.json` change (exact shape):
  ```jsonc
  {
    "dependencies": {
      // ...
      "@chriscode/devmux-telemetry": "^<latest>"
    }
  }
  ```

2) Create a tiny telemetry bootstrap helper (keeps `_layout.tsx` clean)
- Create: `app/lib/devmux/telemetry.ts`
- Purpose:
  - Dev-only (`__DEV__`)
  - Non-intrusive (no changes to existing `console.*` call sites)
  - “Initialize once” guard to avoid double-patching during fast refresh
  - Auto-pick host using the same `Constants.expoConfig.hostUri` pattern you already use in `app/lib/config/env.ts`
  - Allow override via env for edge cases/worktrees

- Add this file (exact code):
  ```ts
  import Constants from "expo-constants";
  import { Platform } from "react-native";
  import { initTelemetry } from "@chriscode/devmux-telemetry";

  const DEFAULT_PORT = 9876;

  function getTelemetryServerUrl(): string {
    const explicit = process.env.EXPO_PUBLIC_DEVMUX_TELEMETRY_URL;
    if (explicit) return explicit;

    // Web: default to same machine
    if (Platform.OS === "web") {
      return `ws://localhost:${DEFAULT_PORT}`;
    }

    if (__DEV__) {
      const debuggerHost =
        Constants?.expoConfig?.hostUri ||
        (Constants?.manifest as any)?.debuggerHost ||
        (Constants?.manifest2 as any)?.extra?.expoGo?.debuggerHost;

      if (debuggerHost) {
        const host = debuggerHost.split(":")[0];
        return `ws://${host}:${DEFAULT_PORT}`;
      }
    }

    // Fallback (simulator-friendly)
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
      appName: "slopcade",
      serverUrl: getTelemetryServerUrl(),
    });
  }
  ```

3) Initialize telemetry from the Expo Router entry point
- Modify: `app/app/_layout.tsx`
- Change: import + call the helper once at module load (dev-only logic lives in helper)

- Minimal patch (exact code change):
  ```ts
  import { Stack } from "expo-router";
  import { GestureHandlerRootView } from "react-native-gesture-handler";
  import { SafeAreaProvider } from "react-native-safe-area-context";
  import "../global.css";
  import { ensureDevMuxTelemetryInitialized } from "@/lib/devmux/telemetry";

  if (typeof window !== "undefined" && typeof global === "undefined") {
    (globalThis as any).global = globalThis;
  }

  ensureDevMuxTelemetryInitialized();

  export default function RootLayout() {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
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
      </GestureHandlerRootView>
    );
  }
  ```

4) Add the telemetry server as a DevMux-managed service
- Modify: `devmux.config.json`
- Change:
  - Add a new `telemetry` service (port 9876)
  - Bind to `0.0.0.0` so physical devices can connect
  - Keep it independent (no dependsOn needed)

- Exact `services.telemetry` block to add:
  ```jsonc
  "telemetry": {
    "cwd": ".",
    "command": "pnpm exec devmux telemetry start --host 0.0.0.0 --port 9876",
    "health": { "type": "port", "port": 9876 }
  }
  ```

5) Enable DevMux “watch” and set watch patterns for telemetry
- Modify: `devmux.config.json`
- Change:
  - Add top-level `watch` config (writes to the same queue file OpenCode reads: `~/.opencode/triggers/queue.jsonl`)
  - Enable watch for the `telemetry` service using built-in pattern sets (at minimum `node`; optionally add `react`)

- Add this top-level block (exact shape):
  ```jsonc
  "watch": {
    "enabled": true,
    "outputDir": "~/.opencode/triggers",
    "dedupeWindowMs": 5000,
    "contextLines": 20
  }
  ```

- Add this under the `telemetry` service (exact shape):
  ```jsonc
  "watch": {
    "enabled": true,
    "include": ["node", "react", "fatal"]
  }
  ```

  Notes:
  - Telemetry client “errors to queue” are handled by the telemetry system itself; this watch config is still valuable to capture telemetry-server crashes/misconfig and unify everything in the same queue tooling.
  - If you want to stay ultra-minimal, use `include: ["node"]` only.

**Verification steps**

1) Start the telemetry server via DevMux
- From repo root:
  ```bash
  devmux ensure telemetry
  devmux status
  ```

2) Start the app as usual (Metro can be separate)
- iOS simulator:
  ```bash
  pnpm ios
  ```

3) Confirm logs stream to tmux
- Generate a log in-app (any existing `console.log` path is fine).
- Find telemetry tmux sessions:
  ```bash
  tmux ls | grep telemetry
  ```
- Attach to the most relevant session:
  ```bash
  tmux attach -t <session-name>
  ```

4) Confirm errors land in the queue
- Trigger a `console.error(new Error("telemetry test"))` or an unhandled rejection in dev.
- Check queue:
  ```bash
  devmux watch queue
  ```

5) Physical device validation (if needed)
- Ensure phone is on same LAN as dev machine.
- Because the server is bound to `0.0.0.0`, the app should connect using the `hostUri`-derived IP automatically.
- If you hit any weird networking/worktree port issues, force it with:
  - Env var: `EXPO_PUBLIC_DEVMUX_TELEMETRY_URL=ws://<your-mac-ip>:9876`

**Effort estimate**
- Short (1–4h)
