# Native Infrastructure

> **Skill for AI Agents**: Metro port 8085, CocoaPods, Android, Expo plugins, preflight checks

## When to Use This Skill

Load when working on: native builds, iOS, Android, CocoaPods, Podfile, Metro port, Expo prebuild, `pnpm ios`, `pnpm android`, react-native-godot, GDExtension, preflight check

## Key Concepts

- Metro runs on port **8085** (not default 8081) — configured at 5+ layers
- Custom Expo plugins (`withMetroPort`, `withGodotAssets`) handle native build configuration
- Preflight check validates port config before every native build
- React Native builds from source (required for custom port injection)
- Godot assets (PCK, GDExtension frameworks) bundled via custom plugin

## Metro Port 8085 (CRITICAL)

The port is configured in ALL of these places — missing any one breaks native builds:

| Location | How |
|----------|-----|
| `app/metro.config.js` | `METRO_PORT = 8085` hardcoded |
| `app/ios/Podfile` | `ENV['RCT_METRO_PORT'] = '8085'` |
| `app/plugins/withMetroPort.js` | Injects port into Podfile.properties.json |
| `app/package.json` scripts | `RCT_METRO_PORT=8085` env prefix on all native commands |
| `devmux.config.json` | `--port 8085` on Metro start command |

**Why from source?** `ios.buildReactNativeFromSource=true` is required because prebuilt React Native binaries hardcode port 8081. Building from source lets the Podfile inject our custom port.

## Custom Expo Plugins

### withMetroPort
- Modifies `Podfile.properties.json` to set `buildReactNativeFromSource=true`
- Injects `RCT_METRO_PORT=8085` into Podfile

### withGodotAssets
- Bundles `app/godot/main.pck` into the .app bundle
- Copies GDExtension frameworks from `godot_project/addons/` into `Frameworks/`
- Required for iOS `dlopen` compatibility with Rapier2D physics

## Preflight Checks

`app/scripts/preflight-check.mjs` runs via `preios`/`preandroid` hooks and validates:
- `ios.buildReactNativeFromSource` is `true`
- `RCT_METRO_PORT` is `8085` in Podfile and env
- `withMetroPort` plugin present in `app.json`
- Supabase credentials present (injected via `hush`)

## DevMux Integration

`pnpm ios` and `pnpm android` (from repo root) ensure:
1. Metro is running via DevMux before launching simulator
2. `--no-bundler` flag prevents duplicate Metro instances
3. `RCT_METRO_PORT=8085` is set in environment

## Common Commands

```bash
# CORRECT (from repo root):
pnpm ios                    # Ensures Metro, runs iOS
pnpm android                # Ensures Metro, runs Android
cd app && pnpm pods         # Install CocoaPods

# NEVER:
expo run:ios                # Missing port config!
npx expo start              # Wrong port!
```

## Gotchas

- NEVER run raw `expo` commands — always use `pnpm` scripts from repo root
- `--port` and `--no-bundler` are mutually exclusive in Expo CLI
- Port is baked into the native binary at compile time — changing it requires a full rebuild
- `ccache` is enabled in Podfile for faster rebuilds (disables `COMPILER_INDEX_STORE_ENABLE`)
- Android namespace is `me.ch5.slopcade.app`
- Godot native module is `@borndotcom/react-native-godot`

## File References

| File | Purpose |
|------|---------|
| `app/metro.config.js` | Metro bundler config (port, monorepo resolution) |
| `app/ios/Podfile` | iOS CocoaPods config, port injection |
| `app/plugins/withMetroPort.js` | Expo plugin for port 8085 |
| `app/plugins/withGodotAssets.js` | Expo plugin for Godot PCK/framework bundling |
| `app/scripts/preflight-check.mjs` | Pre-build validation |
| `app/app.json` | Expo config with plugin declarations |
| `devmux.config.json` | Service orchestration config |
| `app/android/app/build.gradle` | Android build configuration |

## Related Skills

- [godot-engine](godot-engine.md) — WASM/PCK export process
- [testing-patterns](testing-patterns.md) — Pre-commit hooks and CI
