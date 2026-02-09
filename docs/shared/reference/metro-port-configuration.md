# Metro Port Configuration Guide

This project uses **port 8085** instead of the default 8081 to avoid conflicts with other Expo projects.

## Quick Summary

**The `withMetroPort` config plugin handles this automatically.** When you run `expo prebuild` or `expo run:ios`, it:
1. Sets `ios.buildReactNativeFromSource=true` in Podfile.properties.json
2. Enables ccache for faster rebuilds
3. Injects `RCT_METRO_PORT=8085` into the Podfile

You don't need to manually edit any iOS files - the plugin ensures the configuration persists across rebuilds.

## Why This Is Complicated

React Native's Metro bundler port is configured at multiple levels, and **prebuilt React Native binaries have port 8081 hardcoded**. Simply setting environment variables or config files won't work with prebuilt binaries.

## The Solution (What Actually Works)

### 1. Build React Native From Source

In `app/ios/Podfile.properties.json`:

```json
{
  "expo.jsEngine": "hermes",
  "EX_DEV_CLIENT_NETWORK_INSPECTOR": "true",
  "ios.buildReactNativeFromSource": "true",
  "apple.ccacheEnabled": "true"
}
```

**Why**: 
- `ios.buildReactNativeFromSource` disables prebuilt binaries and compiles React Native from source, allowing preprocessor definitions like `RCT_METRO_PORT` to actually take effect.
- `apple.ccacheEnabled` speeds up rebuilds by caching compiled objects.

### 2. Set RCT_METRO_PORT in Podfile

In `app/ios/Podfile`, add this line before the `platform` line (after other ENV settings):

```ruby
# Use port 8085 for Metro bundler (requires ios.buildReactNativeFromSource=true)
ENV['RCT_METRO_PORT'] = '8085'
```

This is already configured in the project's Podfiles.

### 3. Set Port in metro.config.js

In `metro.config.js`:

```javascript
baseConfig.server = {
  port: 8085,
};
```

### 4. Set Port and RCT_METRO_PORT in package.json Scripts

All native build scripts MUST include `RCT_METRO_PORT=8085` and `--no-bundler`:

```json
{
  "scripts": {
    "start": "expo start --port 8085",
    "ios": "RCT_METRO_PORT=8085 expo run:ios --no-bundler",
    "ios:device": "RCT_METRO_PORT=8085 expo run:ios --no-bundler --configuration Release --device",
    "android": "RCT_METRO_PORT=8085 expo run:android --no-bundler",
    "pods": "cd ios && RCT_METRO_PORT=8085 pod install"
  }
}
```

**Important**:
- `RCT_METRO_PORT` env var must be set for `pod install` and native build commands
- `--no-bundler` prevents expo from starting a duplicate Metro instance (devmux manages Metro)
- `--port` and `--no-bundler` are **mutually exclusive** — don't use both. The port is communicated via `RCT_METRO_PORT` env var and baked into the binary at compile time

### 5. Preflight Check (Automated Validation)

A preflight script (`app/scripts/preflight-check.mjs`) runs automatically before every native build via `preios`/`preandroid`/`prepods` hooks. It validates:

1. `Podfile.properties.json` has `ios.buildReactNativeFromSource=true`
2. `Podfile` has `ENV['RCT_METRO_PORT'] = '8085'`
3. `app.json` includes the `withMetroPort` plugin
4. `RCT_METRO_PORT` env var (if set) matches expected port

If any check fails, the build is **blocked** with a clear error message explaining what's wrong and how to fix it.

## Building & Running

Always use the root-level pnpm scripts:

```bash
# From repo root — these handle everything automatically
pnpm ios              # Ensures Metro running + builds iOS
pnpm android          # Ensures Metro running + builds Android

# Clean rebuild
cd app
pnpm run clean:ios
pnpm pods             # Reinstalls pods (preflight check runs first)
cd ..
pnpm ios
```

**Never run raw `expo run:ios` directly** — it bypasses port configuration and Metro management. See `AGENTS.md` for the full table of correct vs. incorrect commands.

## What DOESN'T Work (Failed Approaches)

| Approach                                      | Why It Fails                                      |
| --------------------------------------------- | ------------------------------------------------- |
| Only setting `RCT_METRO_PORT` env var         | Prebuilt binaries ignore preprocessor definitions |
| Only setting `server.port` in metro.config.js | Native app still defaults to 8081                 |
| Deep links with correct port                  | App ignores them and uses hardcoded default       |
| UserDefaults/cache clearing                   | Doesn't change the binary's default               |
| Changing bundle ID alone                      | Fresh app still has 8081 hardcoded                |

## Trade-offs

Building from source means:

- ✅ Port configuration actually works
- ✅ Full control over React Native build settings
- ❌ Longer initial build times (~5-10 min vs ~1-2 min)
- ❌ More disk space for build artifacts

## Verification

After building, check the binary:

```bash
strings /path/to/DerivedData/*/Build/Products/Debug-iphonesimulator/*.app/* | grep -E "808[0-9]"
```

You should see `8085` instead of `8081`.

## Automatic Configuration via Config Plugin

The `withMetroPort` plugin in `app/plugins/withMetroPort.js` runs during `expo prebuild` and automatically:

1. **Modifies Podfile.properties.json** via `withPodfileProperties`:
   - Sets `ios.buildReactNativeFromSource=true`
   - Sets `apple.ccacheEnabled=true`

2. **Modifies Podfile** via `withDangerousMod`:
   - Injects `ENV['RCT_METRO_PORT'] = '8085'` before the `platform :ios` line

This ensures the configuration persists even when:
- Running `expo prebuild --clean`
- Deleting and regenerating the `ios/` directory
- Updating Expo SDK

The plugin is registered in `app.json`:
```json
"plugins": [
  "expo-router",
  "./plugins/withGodotAssets",
  "./plugins/withMetroPort"
]
```

## Files Involved

1. `app/plugins/withMetroPort.js` - Config plugin (source of truth for native port)
2. `app/ios/Podfile.properties.json` - Generated by plugin (buildReactNativeFromSource)
3. `app/ios/Podfile` - Modified by plugin (RCT_METRO_PORT env)
4. `app/metro.config.js` - Hardcoded `server.port: 8085` (catches bare `expo start`)
5. `app/package.json` - All scripts use `RCT_METRO_PORT=8085`, `--no-bundler`, `--port 8085`
6. `app/scripts/preflight-check.mjs` - Validates config before every native build
7. `devmux.config.json` - Metro service command includes `RCT_METRO_PORT=8085`
8. `AGENTS.md` - Documents correct commands (prevents agents from running raw expo)
