# How to Change the Metro Port for an App

This guide walks through every step required to change a Metro port in this project. It's not a one-line config change — the port is baked into the **compiled native binary**, so you must update multiple layers and do a clean rebuild.

## Why It's Complicated

React Native's prebuilt binaries have port **8081 hardcoded** as a preprocessor definition. Setting an environment variable or changing `metro.config.js` alone won't work — the native app ignores it and connects to whatever port was compiled in. To use a custom port, you must:

1. Build React Native **from source** (so the preprocessor definition is recompiled)
2. Set the port in **every layer** that touches it
3. **Clean rebuild** the native binary (old binary has old port baked in)

## Current Port Assignments

| App | Port | 
|-----|------|
| slopcade | 8085 |
| amen | 8086 |
| slopbox | 8087 |
| shader-editor | 8088 |
| pencil | 8089 |

## The Full Checklist

Suppose you're changing an app from port `8085` → `9000`. You must update **all 6 locations** below, then do a clean rebuild. Missing any one of them will cause a broken or mismatched build.

### 1. `metro.config.js` — Metro server port

This is what Metro actually listens on when you run `expo start`.

```js
// apps/<app>/metro.config.js
const METRO_PORT = 9000;  // ← Change this

baseConfig.server = {
    ...baseConfig.server,
    port: METRO_PORT,
};
```

### 2. `plugins/withMetroPort.js` — Expo config plugin

This plugin runs during `expo prebuild` and automates the native configuration. It does two things:
- Sets `ios.buildReactNativeFromSource=true` in `Podfile.properties.json`
- Injects `ENV['RCT_METRO_PORT'] = '<port>'` into the Podfile

```js
// apps/<app>/plugins/withMetroPort.js
const METRO_PORT = '9000';  // ← Change this (string, not number)
```

The plugin must also be registered in `app.json`:
```json
"plugins": [
    "expo-router",
    "./plugins/withMetroPort"
]
```

### 3. `scripts/preflight-check.mjs` — Build validation

The preflight script blocks builds if the port is misconfigured. Update the expected port constant:

```js
// apps/<app>/scripts/preflight-check.mjs
const EXPECTED_PORT = '9000';  // ← Change this
```

### 4. `package.json` — All script commands

Every script that touches native builds must set the `RCT_METRO_PORT` env var. This includes `ios`, `android`, `pods`, and their variants:

```json
{
    "scripts": {
        "start": "expo start --port 9000",
        "dev": "expo start --port 9000",
        "ios": "RCT_METRO_PORT=9000 expo run:ios --no-bundler",
        "ios:device": "pnpm run preflight && RCT_METRO_PORT=9000 expo run:ios --no-bundler --configuration Release --device",
        "ios:device:local": "pnpm run preflight && RCT_METRO_PORT=9000 expo run:ios --no-bundler --device",
        "android": "RCT_METRO_PORT=9000 expo run:android --no-bundler",
        "pods": "cd ios && RCT_METRO_PORT=9000 pod install"
    }
}
```

**Key details:**
- `RCT_METRO_PORT` must be set for `pod install` too — CocoaPods reads it during pod resolution
- `--no-bundler` prevents Expo from spawning a second Metro instance (devmux manages Metro)
- `--port` and `--no-bundler` are **mutually exclusive** — never use both. When using `--no-bundler`, the port is communicated via `RCT_METRO_PORT` and compiled into the binary

### 5. `devmux.config.json` — Service orchestration

If this app has a Metro service managed by devmux, update its command and health check port:

```json
{
    "name": "metro-<app>",
    "comment": "App Metro (port 9000)",
    "command": "... RCT_METRO_PORT=9000 npx hush run -t app -- npx expo start --dev-client --port 9000",
    "cwd": "apps/<app>",
    "health": {
        "type": "port",
        "port": 9000
    }
}
```

Also update the corresponding `ios-build-*` service if one exists:
```json
{
    "name": "ios-build-<app>",
    "command": "RCT_METRO_PORT=9000 npx hush run -t app -- node scripts/preflight-check.mjs && RCT_METRO_PORT=9000 npx expo run:ios --no-bundler"
}
```

### 6. Root `package.json` scripts (if applicable)

Check the repo root `package.json` for any convenience scripts that reference the old port and update them.

## Clean Rebuild (MANDATORY)

After updating all the files above, you **must** do a clean rebuild. The old port number is compiled into the iOS binary as a C preprocessor definition — it won't change without recompilation.

```bash
# From the app directory (e.g., apps/slopcade/)

# 1. Clean the native build artifacts
pnpm run clean:ios
# This runs: rimraf ios/Pods ios/build ~/Library/Developer/Xcode/DerivedData

# 2. Regenerate native projects (the withMetroPort plugin runs here)
npx expo prebuild --clean

# 3. Reinstall pods with the new port
# (RCT_METRO_PORT must be set so CocoaPods picks it up)
pnpm pods

# 4. Build the native app
# From repo root:
pnpm ios  # (or the app-specific variant)
```

**Why each step matters:**
- `clean:ios` removes old compiled binaries that have the old port baked in
- `prebuild --clean` deletes and regenerates the `ios/` directory, triggering the `withMetroPort` plugin to write the new port into `Podfile` and `Podfile.properties.json`
- `pod install` recompiles React Native from source with the new `RCT_METRO_PORT` value
- The final build compiles a binary that connects to the new port

### Verifying the Port

After building, verify the port is baked into the binary:

```bash
# Find the built binary and check for port references
strings ~/Library/Developer/Xcode/DerivedData/*/Build/Products/Debug-iphonesimulator/*.app/* | grep -E "808[0-9]|9000"
```

You should see your new port number, not 8081.

## What Goes Wrong (Failure Modes)

| Symptom | Cause | Fix |
|---------|-------|-----|
| App connects to 8081 | Didn't rebuild native binary | Full clean rebuild (steps above) |
| App connects to old port | DerivedData cached old build | `rm -rf ~/Library/Developer/Xcode/DerivedData` then rebuild |
| Preflight check fails | Forgot to update one of the 6 locations | Check the error message — it tells you exactly which file is wrong |
| `pod install` fails | Missing `RCT_METRO_PORT` env var | Run `RCT_METRO_PORT=9000 pod install`, not bare `pod install` |
| Metro starts but app can't connect | Port mismatch between Metro and binary | Verify `metro.config.js` port matches `package.json` and Podfile |
| Two Metro instances fighting | Used `--port` with `--no-bundler` | They're mutually exclusive — use only `--no-bundler` for native builds |

## How the Pieces Fit Together

```
                    ┌─────────────────────────────────────┐
                    │         expo prebuild --clean        │
                    │  (triggers withMetroPort plugin)     │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────┴──────────────────────┐
                    │                                      │
            ┌───────▼────────┐                ┌───────────▼───────────┐
            │  Podfile        │                │ Podfile.properties    │
            │  ENV[           │                │ ios.buildReactNative  │
            │  'RCT_METRO_   │                │ FromSource = true     │
            │   PORT']='9000' │                │ apple.ccacheEnabled   │
            └───────┬────────┘                │ = true                │
                    │                          └───────────┬───────────┘
                    │                                      │
                    └──────────────┬───────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │       pod install / xcodebuild       │
                    │  Compiles RN from source with        │
                    │  RCT_METRO_PORT=9000 as preprocessor │
                    │  definition → baked into binary      │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │         Native iOS Binary            │
                    │   Connects to localhost:9000         │
                    └─────────────────────────────────────┘

                    ┌─────────────────────────────────────┐
                    │   metro.config.js (port: 9000)       │
                    │   + devmux (--port 9000)             │
                    │   → Metro server listens on :9000    │
                    └─────────────────────────────────────┘
```

## The Preflight Safety Net

Every app has a `scripts/preflight-check.mjs` that runs automatically via `preios`, `preandroid`, and `prepods` npm hooks. It validates:

1. `Podfile.properties.json` has `ios.buildReactNativeFromSource=true`
2. `Podfile` has `ENV['RCT_METRO_PORT'] = '<expected port>'`
3. `app.json` includes the `withMetroPort` plugin
4. `RCT_METRO_PORT` env var (if set) matches the expected port

If any check fails, the build is **blocked** with a specific error message telling you exactly what to fix. This prevents accidentally shipping a binary with the wrong port.

## Android Notes

On Android, the `RCT_METRO_PORT` environment variable is passed to the Gradle build via the `package.json` scripts (`RCT_METRO_PORT=9000 expo run:android --no-bundler`). React Native's Android build reads this env var during compilation. The same "build from source" requirement applies — though Android's build system handles this differently than iOS/CocoaPods.

## Files Reference (per app)

| File | What to change | Type |
|------|---------------|------|
| `metro.config.js` | `METRO_PORT` constant | Number |
| `plugins/withMetroPort.js` | `METRO_PORT` constant | String |
| `scripts/preflight-check.mjs` | `EXPECTED_PORT` constant | String |
| `package.json` | All script commands with port | String in commands |
| `app.json` | Verify plugin is listed | N/A (just check) |
| `devmux.config.json` (root) | Service command + health port | Number/String |
