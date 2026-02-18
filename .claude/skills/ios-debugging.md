---
name: ios-debugging
description: Use when the iOS simulator shows a black screen, crashes on launch, or has rendering issues that require terminal-only autonomous diagnosis.
---

# iOS Simulator Autonomous Debugging

## Overview
This skill provides a terminal-only workflow for diagnosing and fixing iOS simulator issues (black screens, crashes, asset failures) without human interaction. It leverages `xcrun simctl`, `tmux` log capture, and strategic console logging.

## When to Use
- iOS Simulator shows a **black screen** after launch.
- App **crashes immediately** or hangs on the splash screen.
- Assets (fonts, images) fail to load or render incorrectly.
- You need to see **native logs** or **JS console output** from the simulator.

## Autonomous Debugging Loop

### 1. Environment Check
Verify which services are running and where the logs are.
```bash
# Check devmux status
devmux status

# Identify the Metro tmux session (usually omo-slopcade-metro)
tmux ls
```

### 2. Identify Target Device
Find the booted simulator and verify the app is installed.
```bash
# Find booted simulator ID
xcrun simctl list devices | grep Booted

# Check if the app is installed (replace <DEVICE_ID> and filter for bundle ID)
# Bundle IDs: me.ch5.slopcade.app, host.exp.Exponent (Expo Go)
xcrun simctl listapps <DEVICE_ID> 2>&1 | grep -E "slopcade|amen"
```

### 3. Launch with Console Output
Launch the app and stream native logs directly to your terminal.
```bash
# Launch with console-pty to see native output
xcrun simctl launch --console-pty <DEVICE_ID> me.ch5.slopcade.app 2>&1 &
```

### 4. Capture Metro Logs
Metro logs contain the JS `console.log` output. Use `tmux capture-pane` to read them.
```bash
# Capture last 100 lines of Metro logs
tmux capture-pane -t omo-slopcade-metro -p -S -100 2>&1 | grep -E "DEBUG|ERROR|LOG" | tail -30
```

### 5. Strategic Trace Logging
If logs are silent, add `console.log` statements to key entry points:
- `app/_layout.tsx` (Root layout, font loading)
- `app/(tabs)/index.tsx` (Main entry)
- Any component suspected of hanging.

**Example Trace:**
```typescript
console.log("[DEBUG] fontsLoaded=", fontsLoaded, "error=", fontError);
if (!fontsLoaded && !fontError) {
  console.log("[DEBUG] Still loading fonts, returning null (potential black screen)");
  return null; 
}
```

### 6. Reload & Verify
After adding logs, relaunch the app to see the new output.
```bash
# Terminate and Relaunch
xcrun simctl terminate <DEVICE_ID> me.ch5.slopcade.app && \
xcrun simctl launch --console-pty <DEVICE_ID> me.ch5.slopcade.app
```

### 7. Asset Integrity Check
If the issue is related to assets (e.g., fonts failing to register), verify the files and the Metro server.
```bash
# Check if Metro is serving the asset (Port 8085)
curl -s -I "http://localhost:8085/assets?unstable_path=./assets/fonts/Lora-Regular.ttf&platform=ios"

# Verify file type (detects HTML pages disguised as assets)
file ./assets/fonts/Lora-Regular.ttf
```

## Common Signatures & Fixes

| Symptom | Signature | Likely Cause | Fix |
|---------|-----------|--------------|-----|
| **Black Screen** | `fontsLoaded=false`, `error=null` | `useFonts` hook is waiting indefinitely. | Check if font files are valid and served by Metro. |
| **Crash on Launch** | `CTFontManagerError code 104` | iOS cannot register the font (invalid data). | Verify font file integrity with `file` command. |
| **Metro 404** | `curl` returns 404 for asset | Asset path is wrong or Metro is not watching the dir. | Check `unstable_path` and Metro config. |
| **Stale Bundle** | Logs don't match code | Metro cache or simulator state is stale. | `pnpm dev --reset-cache` or wipe simulator. |

## Key Commands Reference

- **Native Logs**: `xcrun simctl spawn <DEVICE_ID> log show --last 2m --predicate 'process == "Slopcade"'`
- **Wipe Simulator**: `xcrun simctl erase <DEVICE_ID>`
- **Open URL**: `xcrun simctl openurl <DEVICE_ID> exp://localhost:8085`
- **Screenshot**: `xcrun simctl io <DEVICE_ID> screenshot screenshot.png`

## Gotchas
- **Metro Port**: This project uses **8085**, not 8081. Always check `localhost:8085`.
- **Bundle ID**: Ensure you are launching the correct bundle (`me.ch5.slopcade.app` for dev client).
- **Async Hangs**: If a hook returns `null` while loading, and loading never finishes, you get a permanent black screen. Always log the state of `loading` and `error` variables.
