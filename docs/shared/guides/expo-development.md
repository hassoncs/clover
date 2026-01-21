# Expo Development Guide

This document explains how Expo development works in this project, including the relationship between DevMux, Metro, and the various build types.

## Quick Reference

| Goal | Command | What Happens |
|------|---------|--------------|
| Start dev server only | `pnpm dev` | Starts Metro via devmux (background tmux) |
| Run iOS with hot reload | `pnpm ios` | Ensures Metro running → builds & launches dev build |
| Run Android with hot reload | `pnpm android` | Ensures Metro running → builds & launches dev build |
| Run Web with hot reload | `pnpm web` | Starts web dev server (separate from Metro) |
| Check service status | `pnpm svc:status` | Shows if Metro is running |
| Stop all services | `pnpm svc:stop` | Kills Metro tmux session |
| Attach to Metro logs | `npx devmux attach metro` | See Metro output in real-time |

---

## Mental Model: The Three Build Types

### 1. Expo Go (❌ Don't Use for This Project)

**What it is:** A pre-built app from the App Store that loads your JS code.

**Why we can't use it:** Expo Go only includes Expo's built-in native modules. This project uses:
- `@shopify/react-native-skia` (custom native code)
- `react-native-box2d` (custom native code)
- `react-native-reanimated` (needs native setup)

These require a **Development Build**.

**How to accidentally trigger it:**
- Running `expo start` without `--dev-client` flag
- Scanning QR code when Expo Go is the default target

### 2. Development Build (✅ What We Use)

**What it is:** Your own native app binary that includes `expo-dev-client` and all your custom native modules.

**How it works:**
```
┌─────────────────┐     HTTP      ┌─────────────────┐
│  Your App       │ ◄──────────── │  Metro Bundler  │
│  (Dev Build)    │   (JS bundle) │  (port 8085)    │
│  on Simulator   │               │  on your Mac    │
└─────────────────┘               └─────────────────┘
```

**Key points:**
- Built with `expo run:ios` or `expo run:android`
- Connects to Metro for JS bundles (hot reload works!)
- Includes ALL your native modules
- Must be rebuilt when native code changes

### 3. Production Build (📦 For Distribution)

**What it is:** Release build with JS embedded (no Metro needed).

**How to create:**
- EAS Build: `eas build --platform ios --profile production`
- Local test: `expo run:ios --configuration Release`

---

## How DevMux Works

DevMux manages long-running services in tmux sessions.

### Configuration (`devmux.config.json`)

```json
{
  "version": 1,
  "project": "skia-physics",
  "services": {
    "metro": {
      "cwd": "app",
      "command": "npx expo start --dev-client --port 8085",
      "health": { "type": "port", "port": 8085 }
    }
  }
}
```

### DevMux Commands

| Command | What It Does |
|---------|--------------|
| `devmux ensure metro` | Start Metro if not running (idempotent) |
| `devmux status` | Show which services are running |
| `devmux stop` | Stop all services |
| `devmux stop metro` | Stop just Metro |
| `devmux attach metro` | Attach to Metro's tmux session (Ctrl+B, D to detach) |

### How Health Checks Work

DevMux checks if port 8085 is listening to determine if Metro is "healthy". This means:
- ✅ Metro running → port 8085 open → health check passes
- ❌ Metro not running → port 8085 closed → devmux starts it

---

## Command Flow Diagrams

### `pnpm ios` (Development with Hot Reload)

```
pnpm ios
    │
    ▼
devmux ensure metro
    │
    ├── Metro not running?
    │       │
    │       ▼
    │   Start tmux session "omo-skia-physics-metro"
    │   Run: expo start --dev-client --port 8085
    │   Wait for port 8085 to be healthy
    │
    └── Metro already running? → Skip
    │
    ▼
expo run:ios --no-bundler --port 8085
    │
    ├── Native app not built yet?
    │       │
    │       ▼
    │   Run prebuild (generate ios/ folder)
    │   Build with Xcode
    │   Install on Simulator
    │
    └── Native app already built? → Just install & launch
    │
    ▼
App launches, connects to Metro on port 8085
Hot reload works! 🎉
```

### `pnpm web`

```
pnpm web
    │
    ▼
cd app && expo start --web
    │
    ▼
Starts webpack dev server (different from Metro!)
Opens browser to the web URL (usually localhost:8081 or similar)
```

---

## Troubleshooting

### "Metro is not running" / "Cannot connect to Metro"

**Symptoms:**
- App shows loading screen forever
- Red error box about connection
- Hot reload doesn't work

**Diagnosis:**
```bash
pnpm svc:status          # Is Metro running?
curl localhost:8085      # Is the port responding?
npx devmux attach metro  # Check Metro logs for errors
```

**Fixes:**
1. `pnpm svc:stop && pnpm ios` - Restart everything
2. Check if another process is using port 8085: `lsof -i :8085`
3. Check Metro logs: `npx devmux attach metro`

### "App opens Expo Go instead of my app"

**Cause:** Metro started without `--dev-client` flag, or `expo-dev-client` not installed.

**Fixes:**
1. Verify `expo-dev-client` is installed: `cd app && npm ls expo-dev-client`
2. If not installed: `cd app && npx expo install expo-dev-client`
3. Rebuild the native app: `cd app && npx expo run:ios`
4. Stop and restart Metro: `pnpm svc:stop && pnpm ios`

### "Hot reload stopped working"

**Possible causes:**
1. Metro crashed - check `npx devmux attach metro`
2. App disconnected - shake device/Cmd+D → "Reload"
3. Port mismatch - ensure `--port 8085` is consistent everywhere

### "Native module not found" errors

**Cause:** Native code changed but app wasn't rebuilt.

**Fix:**
```bash
# Full rebuild
cd app
npx expo run:ios
```

### Web not working / Wrong URL

**Note:** Web uses a different dev server than iOS/Android. The port may differ.

```bash
# For web development, run directly:
cd app && npx expo start --web

# It will print the correct URL to open
```

---

## Script Reference

### Root `package.json` Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `pnpm dev` | Start Metro only | Background server for editors/tools |
| `pnpm ios` | Full iOS dev flow | Daily iOS development |
| `pnpm android` | Full Android dev flow | Daily Android development |
| `pnpm web` | Web dev server | Web development |
| `pnpm svc:status` | Check services | Debugging |
| `pnpm svc:stop` | Stop all services | Cleanup, troubleshooting |

### App `package.json` Scripts

| Script | Purpose | Notes |
|--------|---------|-------|
| `pnpm start` | Start Metro (in app/) | Use root scripts instead |
| `pnpm ios` | Build & run iOS (in app/) | Doesn't ensure Metro is running! |
| `pnpm android` | Build & run Android (in app/) | Doesn't ensure Metro is running! |

**⚠️ Important:** Always use root-level scripts (`pnpm ios` from repo root), not app-level scripts. The root scripts ensure Metro is running first.

---

## First-Time Setup

If you just cloned this repo or cleared your build:

```bash
# 1. Install dependencies
pnpm install

# 2. Install expo-dev-client (required for development builds!)
cd app && npx expo install expo-dev-client && cd ..

# 3. Install pods (iOS)
cd app/ios && pod install && cd ../..

# 4. Build and run (this creates the dev build)
pnpm ios

# First run will take a few minutes to build.
# Subsequent runs are fast (just installs the existing build).
```

### ⚠️ Critical: expo-dev-client

This project REQUIRES `expo-dev-client` because we use custom native modules (Skia, Box2D).

**Check if installed:**
```bash
cd app && npm ls expo-dev-client
```

**Install if missing:**
```bash
cd app && npx expo install expo-dev-client
cd app/ios && pod install  # Re-run pods after installing
```

---

## When to Rebuild Native App

You need to run `expo run:ios` again when:

- ✅ Adding/removing native dependencies (`expo install` something with native code)
- ✅ Changing `app.json` / `app.config.js` native settings
- ✅ Updating Expo SDK version
- ✅ Modifying anything in `ios/` or `android/` folders

You do NOT need to rebuild when:

- ❌ Changing JavaScript/TypeScript code (hot reload handles this)
- ❌ Changing styles, components, screens
- ❌ Adding pure-JS dependencies

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                        Your Machine                          │
│                                                             │
│  ┌─────────────────┐         ┌─────────────────────────┐   │
│  │    DevMux       │         │      Simulator          │   │
│  │  (tmux manager) │         │                         │   │
│  │                 │         │  ┌─────────────────┐    │   │
│  │  ┌───────────┐  │  HTTP   │  │   Dev Build     │    │   │
│  │  │  Metro    │◄─┼─────────┼──│   (your app)    │    │   │
│  │  │  :8085    │  │  bundle │  │                 │    │   │
│  │  └───────────┘  │         │  └─────────────────┘    │   │
│  └─────────────────┘         └─────────────────────────┘   │
│                                                             │
│  pnpm ios = devmux ensure metro + expo run:ios --no-bundler│
└─────────────────────────────────────────────────────────────┘
```

---

## Deep Dive: Expo CLI Commands

### `expo start` - The Dev Server

```bash
expo start [options]
```

**What it does:**
1. Starts Metro bundler (transforms/bundles your JS/TS code)
2. Starts Expo dev server (handles the dev menu, QR code, etc.)
3. Waits for a client to connect

**Critical flags:**

| Flag | Effect |
|------|--------|
| `--dev-client` | Force development build target. **Use this.** |
| `--go` | Force Expo Go target. **Never use for this project.** |
| `--port <n>` | Metro bundler port (default 8081) |
| `--web` | Also start web dev server |
| (none) | Auto-detect target. **Unreliable for automation.** |

**Why `--dev-client` matters:**

Without it, `expo start` tries to auto-detect whether to target Expo Go or a dev build. This detection can fail or behave differently based on:
- Whether `expo-dev-client` is in package.json
- Whether native folders exist
- Interactive vs non-interactive terminal
- Phase of the moon (kidding, but it feels that way)

**Always use `--dev-client` for deterministic automation.**

### `expo run:ios` / `expo run:android` - Build & Run

```bash
expo run:ios [options]
expo run:android [options]
```

**What it does:**
1. Runs `prebuild` if needed (generates native folders from app.json)
2. Builds the native app (Xcode/Gradle)
3. Installs on simulator/device
4. Launches the app
5. **By default, also tries to manage Metro**

**Critical flags:**

| Flag | Effect |
|------|--------|
| `--no-bundler` | Don't start/manage Metro. **Use when devmux owns Metro.** |
| `--port <n>` | Tell the app which port Metro is on |
| `--configuration Release` | Production build (no Metro needed) |
| `--device <name>` | Target specific device |

**Why `--no-bundler` matters:**

Without it, `expo run:ios` will:
- Check if Metro is already running
- If not, start its own Metro instance
- If yes, maybe use the existing one, maybe not (race conditions)

This creates "who owns Metro?" ambiguity. When devmux is your Metro manager, always use `--no-bundler`.

### The Port Flag Gotcha

The `--port` flag means different things:

| Command | What `--port` does |
|---------|-------------------|
| `expo start --port 8085` | Metro listens on 8085 |
| `expo run:ios --port 8085` | Tells the app "Metro is on 8085" |

These MUST match! If Metro runs on 8085 but the app thinks it's on 8081, you get "Cannot connect to Metro".

---

## Deep Dive: DevMux

### What DevMux Actually Does

DevMux is a tmux-based service manager. When you run `devmux ensure metro`:

1. Checks if tmux session `omo-skia-physics-metro` exists
2. If not, creates it and runs the configured command
3. Waits for health check (port 8085 responding)
4. Returns success

The Metro process runs **inside tmux**, which means:
- It persists after your terminal closes
- You can attach to see logs: `devmux attach metro`
- Ctrl+B, D to detach without killing it
- `devmux stop` actually kills the tmux session

### Health Check Limitation

DevMux checks if port 8085 is open. This has a false-positive risk:

```bash
# If some OTHER process is on 8085...
lsof -i :8085
# ...devmux thinks Metro is healthy, but it's not Metro!
```

This rarely happens in practice, but if you see weird issues, check what's actually on the port.

### Tmux Session Naming

DevMux names sessions: `omo-{project}-{service}`

For this project: `omo-skia-physics-metro`

```bash
# List all tmux sessions
tmux list-sessions

# Attach directly (alternative to devmux attach)
tmux attach -t omo-skia-physics-metro
```

---

## Deep Dive: The Native Build

### What's in the `ios/` Folder

```
app/ios/
├── Podfile              # CocoaPods dependencies
├── Podfile.lock         # Locked versions
├── Pods/                # Installed pods (gitignored)
├── skiacanvaswasmdeploytest/
│   ├── AppDelegate.mm   # App entry point
│   ├── Info.plist       # App metadata
│   └── ...
└── skiacanvaswasmdeploytest.xcworkspace  # Open this in Xcode
```

### When Native Rebuild is Required

**Triggers for rebuild:**

1. **New native dependency**: `expo install react-native-something`
2. **Expo SDK upgrade**: Version changes often include native changes
3. **app.json changes**: Bundle ID, permissions, splash screen, etc.
4. **Manual native changes**: Editing anything in `ios/` or `android/`

**Signs you need a rebuild:**

- "Native module X is not installed"
- App crashes immediately on launch
- New permission not working
- Splash screen not updated

**Rebuild command:**
```bash
cd app && npx expo run:ios
# Or for clean rebuild:
cd app && npx expo run:ios --no-build-cache
```

### The Prebuild Step

`expo run:ios` internally does:

1. `expo prebuild` - Generates/updates native folders from app.json
2. `pod install` - Installs iOS dependencies
3. `xcodebuild` - Compiles the native app
4. `xcrun simctl install` - Installs on simulator
5. `xcrun simctl launch` - Launches the app

You can run these separately if debugging:

```bash
cd app
npx expo prebuild --platform ios  # Just generate native code
cd ios && pod install             # Just install pods
npx expo run:ios --no-install     # Build but don't install
```

---

## Common Mistakes and Fixes

### Mistake 1: Running app-level scripts from repo root

```bash
# WRONG - runs app/package.json "ios" script, doesn't ensure Metro
cd /path/to/repo
pnpm --filter app ios

# RIGHT - runs root package.json "ios" script, ensures Metro first
cd /path/to/repo
pnpm ios
```

### Mistake 2: Starting Metro twice

```bash
# WRONG - starts Metro, then expo run:ios starts another
pnpm dev          # Starts Metro via devmux
cd app && npx expo run:ios  # Starts ANOTHER Metro!

# RIGHT - use --no-bundler
pnpm dev
cd app && npx expo run:ios --no-bundler --port 8085
```

### Mistake 3: Port mismatch

```bash
# WRONG - Metro on 8085, but app looks for 8081
# devmux.config.json: "expo start --dev-client --port 8085"
cd app && npx expo run:ios  # Defaults to port 8081!

# RIGHT - always specify port
cd app && npx expo run:ios --no-bundler --port 8085
```

### Mistake 4: Forgetting expo-dev-client

```bash
# Check if installed
cd app && npm ls expo-dev-client

# If not installed, everything breaks subtly
# Install it:
cd app && npx expo install expo-dev-client
cd ios && pod install
```

---

## Web Development Notes

Web is different from iOS/Android:

| Aspect | iOS/Android | Web |
|--------|-------------|-----|
| Bundler | Metro | Webpack (via Metro) |
| Server command | `expo start --dev-client` | `expo start --web` |
| Port | Configurable | Often different from Metro port |
| Native code | Runs natively | Polyfilled or unavailable |

**Key difference:** `expo start --web` starts a SEPARATE dev server. The `--port` flag behavior is different for web.

For this project, web is a secondary target. The recommended workflow:

```bash
# For web development, run directly (not via devmux):
cd app && npx expo start --web

# The terminal will show the correct URL to open
```

---

## Debugging Checklist

When something isn't working:

```bash
# 1. Is Metro running?
pnpm svc:status

# 2. What's on port 8085?
lsof -i :8085

# 3. Can you reach Metro?
curl http://localhost:8085/status

# 4. Check Metro logs
npx devmux attach metro
# (Ctrl+B, D to detach)

# 5. Is expo-dev-client installed?
cd app && npm ls expo-dev-client

# 6. Nuclear option - restart everything
pnpm svc:stop
cd app/ios && rm -rf Pods && pod install && cd ../..
pnpm ios
```

---

## Version Compatibility

Expo has strict version requirements. Check compatibility:

```bash
cd app && npx expo doctor
```

Common output:
```
The following packages should be updated for best compatibility:
  react-native-reanimated@4.2.1 - expected version: ~4.1.1
```

Fix with:
```bash
cd app && npx expo install --fix
```

---

## Summary: The Golden Path

For daily development:

```bash
# From repo root
pnpm ios          # iOS with hot reload
pnpm android      # Android with hot reload  
pnpm web          # Web with hot reload

# To check/manage services
pnpm svc:status   # Is Metro running?
pnpm svc:stop     # Stop Metro

# To see Metro logs
npx devmux attach metro
```

For native changes:

```bash
cd app
npx expo install <package>  # Add native dependency
cd ios && pod install       # Update pods
cd ..
npx expo run:ios            # Rebuild
```

**Remember:** The root scripts handle everything. Just run `pnpm ios` and it works.
