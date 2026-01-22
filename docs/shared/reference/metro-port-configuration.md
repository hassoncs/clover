# Metro Port Configuration Guide

This project uses **port 8085** instead of the default 8081 to avoid conflicts with other Expo projects.

## Why This Is Complicated

React Native's Metro bundler port is configured at multiple levels, and **prebuilt React Native binaries have port 8081 hardcoded**. Simply setting environment variables or config files won't work with prebuilt binaries.

## The Solution (What Actually Works)

### 1. Build React Native From Source

In `ios/Podfile.properties.json`:

```json
{
  "expo.jsEngine": "hermes",
  "EX_DEV_CLIENT_NETWORK_INSPECTOR": "true",
  "ios.buildReactNativeFromSource": "true"
}
```

**Why**: This disables prebuilt binaries and compiles React Native from source, allowing preprocessor definitions like `RCT_METRO_PORT` to actually take effect.

### 2. Set RCT_METRO_PORT in Podfile

In `ios/Podfile`, add this line before the `target` block:

```ruby
ENV['RCT_METRO_PORT'] = '8085'
```

### 3. Set Port in metro.config.js

In `metro.config.js`:

```javascript
baseConfig.server = {
  port: 8085,
};
```

### 4. Set Port and RCT_METRO_PORT in package.json Scripts

All native build scripts MUST include `RCT_METRO_PORT=8085` environment variable AND `--port 8085`:

```json
{
  "scripts": {
    "start": "expo start --dev-client --port 8085",
    "ios": "RCT_METRO_PORT=8085 expo run:ios --port 8085",
    "ios:device": "RCT_METRO_PORT=8085 expo run:ios --configuration Release --device --port 8085",
    "android": "RCT_METRO_PORT=8085 expo run:android --port 8085",
    "pods": "cd ios && RCT_METRO_PORT=8085 pod install"
  }
}
```

**Important**: The `RCT_METRO_PORT` env var must be set for `pod install` and native build commands, not just `--port`.

## Building & Running

After making these changes:

```bash
# Clean everything
rm -rf ios/build ios/Pods ~/Library/Developer/Xcode/DerivedData/*skia*

# Reinstall pods (builds RN from source now)
cd ios && RCT_METRO_PORT=8085 pod install && cd ..

# Build and run
RCT_METRO_PORT=8085 npx expo run:ios --port 8085
```

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

## Files Modified

1. `ios/Podfile.properties.json` - Enable building from source
2. `ios/Podfile` - Set `RCT_METRO_PORT`
3. `metro.config.js` - Set `server.port`
4. `package.json` - All scripts use `RCT_METRO_PORT=8085` AND `--port 8085`
5. `devmux.config.json` - Metro service command includes `RCT_METRO_PORT=8085`
6. `app.json` - Bundle ID changed to `com.skia.physics.test`
