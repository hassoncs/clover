---
name: native-infrastructure
description: "Native build infrastructure for iOS/Android. Covers Metro port 8085, CocoaPods, Podfile, Expo prebuild, expo plugins (withGodotAssets, withCameraFrameProcessor), preflight checks, and react-native-godot integration. Use when working on native builds, iOS/Android issues, or Expo config plugins."
---

# Native Infrastructure

> Metro port 8085, CocoaPods, Android, Expo plugins, preflight checks

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

## Multi-Brand Builds (Slopcade + Amen)

This project builds two apps from one codebase via `BRAND_ID` env var. `metro` and `metro-amen` are **mutually exclusive** on port 8085 — each kills the other on start.

### Brand Workflow

**Slopcade (default):**
```bash
devmux ensure metro          # Starts slopcade Metro (kills metro-amen if running)
devmux ensure ios            # Builds + installs slopcade app (auto-starts metro)
```

**Amen:**
```bash
devmux ensure metro-amen     # Starts amen Metro, clears cache, kills metro first
devmux ensure ios-amen       # Prebuilds ios/ for amen, builds + installs amen app
# Note: ios/ is now in amen state. Restore with:
cd app && pnpm prebuild      # Restores ios/ to slopcade config
```

**Switch back to Slopcade after Amen build:**
```bash
devmux ensure metro          # Kills metro-amen, starts metro
cd app && pnpm prebuild      # Restores ios/ to slopcade bundle ID
```

### Why `ios/` needs prebuild to switch brands

`app.config.ts` bakes `BRAND_ID` into the Xcode project at prebuild time:
- Bundle identifier (`me.ch5.slopcade.app` vs `games.amen.app`)
- Entitlements (associated domains)
- App icon asset catalog

Without prebuild, `expo run:ios` builds with whatever bundle ID is currently in `ios/`. The `ios-amen` devmux service runs `expo prebuild --no-install` automatically before building.

### ccache Efficiency

Both brands compile the same C++/Obj-C native modules. ccache hits on all shared code (~90% of compile time). Switching brands after first build of each:
- Prebuild: ~5-10s
- Incremental native build (xcode link only): ~1-2 min
- JS bundle only change: ~15s

### `app/package.json` Brand Scripts

| Script | What it does |
|--------|-------------|
| `pnpm prebuild` | Regenerates `ios/` for slopcade brand |
| `pnpm prebuild:amen` | Regenerates `ios/` for amen brand |
| `pnpm ios:amen` | Prebuilds amen + builds iOS (use from `app/` dir) |

## Common Commands

```bash
# CORRECT (from repo root):
pnpm ios                    # Ensures Metro, runs slopcade iOS
pnpm android                # Ensures Metro, runs Android
cd app && pnpm pods         # Install CocoaPods

# Brand-switching (devmux):
devmux ensure metro-amen    # Switch Metro to amen brand
devmux ensure ios-amen      # Build amen app on simulator

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
- **metro vs metro-amen**: Both use port 8085, cannot run simultaneously. Each kills the other on start via `tmux kill-session`.
- **ios/ state**: After `devmux ensure ios-amen`, `ios/` is configured for amen. Run `pnpm prebuild` in `app/` to restore slopcade config.
- **Font assets**: Custom fonts must be valid TTF/OTF binaries — verify with `file path/to/font.ttf`. GitHub HTML pages disguised as `.ttf` cause `CTFontManagerError 104` and a black screen.
- **metro-amen renamed**: Previously `metro:amen` — renamed to `metro-amen` because colons in tmux session names (`omo-slopcade-metro:amen`) cause the session to appear as "running outside tmux" in devmux status.

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

## CI/CD & EAS Configuration

### GitHub Actions Build Reliability
Use `pnpm install --frozen-lockfile --ignore-scripts` in CI to avoid postinstall race failures from native modules.

### EAS CI for Branded Apps
EAS CI should be path-scoped per app (`apps/slopcade`, `apps/amen`, etc.) and use non-interactive-friendly profile (`preview`) on push builds when production credentials are not guaranteed.

### Dynamic Expo Config Gotcha
For apps with `app.config.ts`, EAS cannot auto-write projectId. Set `extra.eas.projectId` in dynamic config manually:

```typescript
// In apps/amen/app.config.ts
extra: {
  eas: {
    projectId: "c628a2f5-88db-4d6e-9646-25473e70f35e",
  },
}
```

### Valid EAS Project IDs
- Amen: `c628a2f5-88db-4d6e-9646-25473e70f35e`
- Slopbox: `0986ef4c-3af5-431b-9479-b311f95e154d`  
- Shader Editor: `6ecf901e-23a0-4963-91c2-60e62f70be2a`
- Slopcade: Already linked in `apps/slopcade/app.json`

### Landing Deploy Path-Scoping and Naming
Brand/domain remains `slopbox` (`slopbox.tv`), but Cloudflare Pages project is `slotbox-landing`. Keep this mapping explicit:
- GitHub workflow: `--project-name=slotbox-landing`
- Wrangler config: `name = "slotbox-landing"`
- Bootstrap step may be needed for first deploy: `wrangler pages project create slotbox-landing --production-branch main || true`

### Related Files
| File | Purpose |
|------|---------|
| `.github/workflows/eas-build.yml` | Path-scoped EAS builds per app |
| `.github/workflows/deploy-landing.yml` | Cloudflare Pages landing deployment |
| `apps/amen/app.config.ts` | Amen EAS project ID |
| `apps/slopbox/app.config.ts` | Slopbox EAS project ID |
| `apps/shader-editor/app.json` | Shader Editor EAS project ID |
| `apps/landing-slopbox/wrangler.toml` | Cloudflare Pages config |

