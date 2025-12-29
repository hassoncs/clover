# Native Strategy & Reproducibility Plan

Expo + React Native + Skia (Option B: Committed Native Projects)

## Goals

This project prioritizes:

- Guaranteed reproducible native builds over time
- Clone → install → build reliability on iOS and Android
- The ability to make and retain custom native changes
- Controlled, intentional upgrades of Expo and React Native

To achieve this, we commit native projects (`ios/` and `android/`) and treat them as first-class source code.

## High-Level Decision

**We commit native projects**

- `ios/`
- `android/`

These directories are source, not generated artifacts.

**We do NOT rely on Expo prebuild for day-to-day development**

- `expo prebuild` is treated as an upgrade / regeneration tool, not a routine step
- Native folders are not deleted casually

This trades easier upgrades for much higher confidence that old commits still build.

## What Is Checked Into Git

### Always Committed

#### JavaScript / Expo

- `package.json`
- Lockfile (exactly one):
  - `pnpm-lock.yaml` or
  - `yarn.lock` or
  - `package-lock.json`
- `app.json` or `app.config.(js|ts)`
- `babel.config.js`
- `metro.config.js`
- `tsconfig.json`
- `eas.json` (if using EAS)
- `patches/` (if using patch-package)
- `scripts/` (clean/setup helpers)

#### iOS

- `ios/**`
- `ios/Podfile`
- `ios/Podfile.lock` ✅ (important for reproducibility)
- `.xcodeproj` / `.xcworkspace`
- Entitlements, build settings, plist files

#### Android

- `android/**`
- `build.gradle`, `settings.gradle`, `gradle-wrapper.properties`
- Gradle configs required to build

## What Is Ignored (Never Committed)

### General

```
node_modules/
.expo/
.expo-shared/
dist/
web-build/
.DS_Store
```

### iOS

```
ios/Pods/
ios/build/
**/xcuserdata/
**/*.xcuserstate
DerivedData/
```

### Android

```
android/.gradle/
android/build/
android/app/build/
```

Native build outputs and caches are always regenerated locally.

## Why Podfile.lock Is Committed

Because native projects are source, Podfile.lock is part of the lock chain:

- JS deps → locked by package manager
- Native iOS deps → locked by Podfile.lock

This significantly reduces:

- "works on my machine" pod drift
- breakage when CocoaPods repo changes
- subtle Skia / RN native mismatches

This is intentionally different from Expo-managed (CNG) projects.

## Reproducibility Workflow (Confidence Check)

At any time, the following should work on a clean machine:

```bash
git clone <repo>
cd <repo>
pnpm install
pnpm run verify:ios
```

If this fails, the repo is considered broken and should be fixed before proceeding.

## Standard Scripts

Required scripts in `package.json`:

```json
{
  "scripts": {
    "start": "expo start",
    "web": "expo start --web",
    "ios": "expo run:ios",
    "android": "expo run:android",
    "doctor": "expo doctor",
    "clean:js": "rimraf node_modules .expo .expo-shared dist web-build",
    "clean:ios": "rimraf ios/Pods ios/build ~/Library/Developer/Xcode/DerivedData",
    "clean:android": "rimraf android/.gradle android/build android/app/build",
    "clean": "pnpm run clean:js && pnpm run clean:ios && pnpm run clean:android",
    "pods": "cd ios && pod install",
    "verify:ios": "pnpm run doctor && pnpm run pods && pnpm run ios",
    "verify:android": "pnpm run doctor && pnpm run android"
  },
  "devDependencies": {
    "rimraf": "^6.0.0"
  }
}
```

`rimraf` is used for cross-platform safety.

## When and How to Use expo prebuild

### ❌ Do NOT run casually

`expo prebuild` can overwrite native files. We only use it intentionally.

### ✅ Approved use cases

- Upgrading Expo SDK
- Upgrading React Native
- Regenerating native to compare against committed version

## Upgrade Strategy (Expo / React Native)

Upgrades are deliberate and manual.

### Step 0: Create an upgrade branch

```bash
git checkout -b upgrade/expo-XX
```

### Step 1: Update JS dependencies

```bash
npx expo upgrade
```

or manually:

- bump expo
- bump react-native
- update related Expo packages

Commit JS changes only:

```bash
git commit -m "Upgrade Expo SDK (JS deps)"
```

### Step 2: Regenerate native projects for comparison

```bash
rm -rf ios android
npx expo prebuild --clean
```

At this point:

- New `ios/` and `android/` are generated
- These are NOT blindly trusted

### Step 3: Compare & merge

Diff:

- new generated native
- vs old committed native

Manually:

- port over required changes
- keep custom native edits
- discard unwanted Expo changes

This is the most important step.

### Step 4: Install native deps

```bash
cd ios
pod install
cd ..
```

### Step 5: Verify

```bash
pnpm run verify:ios
pnpm run verify:android
```

Fix issues until both pass.

### Step 6: Commit native updates

```bash
git add ios android
git commit -m "Update native projects for Expo SDK XX"
```

## Toolchain Pinning (Strongly Recommended)

To reduce long-term build rot:

### Node

- Commit `.nvmrc` or `.node-version`

### CocoaPods

Optionally use Bundler:

- `Gemfile`
- `Gemfile.lock`
- Run:

```bash
bundle exec pod install
```

### Xcode

- Document required Xcode version in README

## Summary of This Strategy

We choose:

- Stability over automation
- Explicit native control over regeneration magic
- Slower upgrades but fewer "why doesn't this build anymore?" moments

We accept:

- Native merge work during upgrades
- Slightly heavier repo

We gain:

- Confidence
- Predictability
- A template that still builds years later

## One-Line Rule for Agents

> Native folders are source. Never delete or regenerate them unless performing an intentional upgrade following this document.

## Related Documentation

- [README.md](./README.md) - Main project documentation and CanvasKit deployment guide
- [canvas-kit-prompt.md](./canvas-kit-prompt.md) - CanvasKit-specific configuration notes
