# Bluetooth iOS Crash Fix & Sentry Integration

## Context

### Original Request
iOS TestFlight build crashes immediately after user accepts Bluetooth permission dialog when "Host Game" is clicked. User needs:
1. The crash fixed
2. Automated crash reporting for future visibility (strangers will test soon)
3. Defensive error handling throughout Bluetooth stack

### Interview Summary
**Key Discussions**:
- Crash occurs during BLE peripheral initialization after permission granted
- User has EAS Build → TestFlight workflow already working
- No crash logs currently available (manual retrieval is unreliable)
- Strangers will be testing soon, need instrumentation ASAP

**Research Findings**:
1. **Root Cause Identified**: Force unwraps in `setupService()` (lines 278-285) crash if any characteristic UUID is invalid
2. **Sentry Integration**: Works with Expo SDK 54 via `@sentry/react-native` + config plugin
3. **BLE Architecture**: JS → BLETransport → BLEPeripheralManager → Native module

### Gap Analysis
**Identified Gaps** (addressed in plan):
- Force unwrap crash risk in Swift native module
- No crash reporting infrastructure
- Thin error handling in BLE stack
- Missing validation of config values passed to native module

---

## Work Objectives

### Core Objective
Fix the iOS Bluetooth crash and add Sentry crash reporting so future crashes are automatically captured with full stack traces.

### Concrete Deliverables
1. Patched `BLEPeripheralModule.swift` with safe optional handling
2. Sentry SDK integrated with Expo config plugin
3. EAS Build configured to upload dSYMs automatically
4. Defensive error handling in JS-side Bluetooth code
5. Working TestFlight build that doesn't crash on Bluetooth permission

### Definition of Done
- [ ] "Host Game" button works without crashing on fresh iOS install
- [ ] Sentry dashboard shows test crash event
- [ ] EAS Build uploads dSYMs (visible in Sentry)
- [ ] Bluetooth hosting still works end-to-end (clients can connect)

### Must Have
- Fix force-unwrap crash in native module
- Sentry capturing native iOS crashes
- Backward compatible with existing JS Bluetooth API

### Must NOT Have (Guardrails)
- ❌ Do NOT modify Android native code
- ❌ Do NOT add BLE retry/reconnection logic (out of scope)
- ❌ Do NOT refactor entire BLE architecture
- ❌ Do NOT eject from Expo managed workflow
- ❌ Do NOT hardcode Sentry auth tokens (use EAS secrets)
- ❌ Do NOT add additional crash reporting tools (just Sentry)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (no unit tests for native modules)
- **User wants tests**: Manual TestFlight verification
- **Framework**: N/A for native Swift fixes

### Manual QA Procedures

**For Bluetooth Fix:**
1. Build with EAS: `eas build --platform ios --profile preview`
2. Install on physical iOS device via TestFlight
3. Fresh install (delete app first to reset permissions)
4. Open app → Navigate to Bluetooth multiplayer example
5. Click "Host Game" → Accept Bluetooth permission dialog
6. **Expected**: No crash, hosting starts successfully
7. Connect a second device as client to verify full flow

**For Sentry Integration:**
1. After Sentry setup, add intentional test crash
2. Run on device, trigger test crash
3. Check Sentry dashboard for crash event
4. Verify dSYMs uploaded (crash should be symbolicated)

---

## Task Flow

```
┌─────────────────────────────────────────────────────────┐
│               PHASE 1: FIX THE CRASH                    │
│                                                         │
│  Task 1 ─────────────────────────────────────────────┐  │
│  (Fix force unwraps in Swift)                        │  │
│                                                      │  │
│  Task 2 ─────────────────────────────────────────────┤  │
│  (Add JS-side config validation)                     │  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│            PHASE 2: ADD SENTRY                          │
│                                                         │
│  Task 3 ─────────────────────────────────────────────┐  │
│  (Install & configure Sentry)                        │  │
│                                                      │  │
│  Task 4 ─────────────────────────────────────────────┤  │
│  (Configure EAS secrets)                             │  │
│                                                      │  │
│  Task 5 ─────────────────────────────────────────────┤  │
│  (Add test crash & verify)                           │  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│         PHASE 3: DEFENSIVE ERROR HANDLING               │
│                                                         │
│  Task 6 ─────────────────────────────────────────────┐  │
│  (Add error handling to BLETransport.ts)             │  │
│                                                      │  │
│  Task 7 ─────────────────────────────────────────────┤  │
│  (Add Sentry breadcrumbs for BLE events)             │  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│           PHASE 4: BUILD & VERIFY                       │
│                                                         │
│  Task 8 ─────────────────────────────────────────────┐  │
│  (EAS Build + TestFlight verification)               │  │
└─────────────────────────────────────────────────────────┘
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 1, 2 | Independent files (Swift vs TypeScript) |
| B | 3, 4 | Can setup Sentry while configuring secrets |
| - | 5, 6, 7, 8 | Sequential (depend on prior tasks) |

---

## TODOs

### Phase 1: Fix the Crash

- [ ] 1. Fix force unwraps in BLEPeripheralModule.swift

  **What to do**:
  - Replace force unwraps (`!`) with safe optional handling in `setupService()`
  - Add guard statements to validate characteristics before adding to service
  - Add error logging when characteristics fail to initialize
  - Replace force unwrap on `peripheralManager.add(service!)` with safe optional

  **Must NOT do**:
  - Do NOT change the public API signatures
  - Do NOT modify Android code
  - Do NOT add new dependencies

  **Parallelizable**: YES (with task 2)

  **References**:
  
  **Primary file to modify**:
  - `app/ios/Slopcade/BLEPeripheralModule.swift:239-286` - The `setupService()` method containing force unwraps

  **Pattern References**:
  - `app/ios/Slopcade/BLEPeripheralModule.swift:51-57` - Existing guard-let pattern for config validation (follow this style)
  - `app/ios/Slopcade/BLEPeripheralModule.swift:102-107` - Example of guard-let with early return

  **Context**:
  - Lines 244-275 create characteristics from UUID strings - if UUID is invalid/empty, these become nil
  - Lines 278-285 force unwrap these characteristics, causing crash
  - The `characteristics` dictionary comes from JS config (line 60)

  **Acceptance Criteria**:
  - [ ] No force unwraps (`!`) remain in `setupService()` method
  - [ ] If any characteristic fails to initialize, log error and skip (don't crash)
  - [ ] Service should still work if only some characteristics are valid
  - [ ] `tsc --noEmit` passes (no TS changes, but verify no regressions)
  - [ ] Manual: Xcode build succeeds without warnings related to optionals

  **Commit**: YES
  - Message: `fix(ios): replace force unwraps with safe optional handling in BLE module`
  - Files: `app/ios/Slopcade/BLEPeripheralModule.swift`

---

- [ ] 2. Add JS-side config validation before calling native module

  **What to do**:
  - Add UUID format validation in `BLEPeripheralManager.ts` before calling native `initialize`
  - Validate all required config fields are present and non-empty
  - Throw descriptive error if validation fails (better than native crash)
  - Add TypeScript types for the config if missing

  **Must NOT do**:
  - Do NOT change the external API (keep backward compatible)
  - Do NOT add new npm dependencies

  **Parallelizable**: YES (with task 1)

  **References**:
  
  **Primary file to modify**:
  - `app/lib/networking/native/BLEPeripheralModule.ts` - Native bridge module

  **Related files for context**:
  - `app/lib/networking/ble/BLEPeripheralManager.ts` - Abstraction layer that calls native
  - `app/lib/networking/ble/constants.ts` - BLE UUIDs and constants (verify these are valid)

  **Pattern References**:
  - `app/lib/networking/ble/BLETransport.ts:startHosting` - See how config is built before calling peripheral manager

  **UUID Validation Pattern**:
  ```typescript
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isValidUUID = (uuid: string) => UUID_REGEX.test(uuid);
  ```

  **Acceptance Criteria**:
  - [ ] Invalid UUID throws descriptive JS error before reaching native code
  - [ ] Missing config fields throw descriptive JS error
  - [ ] `tsc --noEmit` passes
  - [ ] Existing working configs continue to work unchanged

  **Commit**: YES
  - Message: `fix(ble): add config validation before native BLE initialization`
  - Files: `app/lib/networking/native/BLEPeripheralModule.ts`, `app/lib/networking/ble/BLEPeripheralManager.ts`

---

### Phase 2: Add Sentry Crash Reporting

- [ ] 3. Install and configure Sentry SDK with Expo

  **What to do**:
  - Run Sentry wizard: `npx @sentry/wizard@latest -i reactNative`
  - Or manual: `npx expo install @sentry/react-native`
  - Add Sentry config plugin to `app.json`
  - Update `metro.config.js` to use `getSentryExpoConfig`
  - Initialize Sentry early in app entry point (`app/_layout.tsx`)
  - Wrap root component with `Sentry.wrap()`

  **Must NOT do**:
  - Do NOT hardcode DSN or auth tokens in source code
  - Do NOT enable Sentry in development (only release builds)

  **Parallelizable**: YES (with task 4)

  **References**:
  
  **Files to modify**:
  - `app/app.json` - Add Sentry plugin (lines 9-13 is plugins array)
  - `app/metro.config.js` - Add Sentry Metro config
  - `app/_layout.tsx` - Initialize Sentry and wrap root

  **Official Documentation**:
  - Expo Sentry Guide: https://docs.expo.dev/guides/using-sentry/
  - Sentry React Native: https://docs.sentry.io/platforms/react-native/manual-setup/expo/

  **app.json plugin configuration**:
  ```json
  [
    "@sentry/react-native/expo",
    {
      "organization": "your-org",
      "project": "slopcade"
    }
  ]
  ```

  **metro.config.js pattern**:
  ```javascript
  const { getSentryExpoConfig } = require("@sentry/react-native/metro");
  const config = getSentryExpoConfig(__dirname);
  module.exports = config;
  ```

  **Sentry.init pattern**:
  ```typescript
  import * as Sentry from '@sentry/react-native';
  
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    debug: __DEV__,
    enabled: !__DEV__, // Only in production
    enableNative: true, // Capture native crashes
  });
  ```

  **Acceptance Criteria**:
  - [ ] `@sentry/react-native` installed in package.json
  - [ ] Sentry plugin added to app.json
  - [ ] Metro config updated with Sentry config
  - [ ] Sentry initialized in _layout.tsx
  - [ ] DSN comes from environment variable, not hardcoded
  - [ ] `tsc --noEmit` passes

  **Commit**: YES
  - Message: `feat(monitoring): integrate Sentry crash reporting with Expo`
  - Files: `app/package.json`, `app/app.json`, `app/metro.config.js`, `app/_layout.tsx`

---

- [ ] 4. Configure EAS secrets for Sentry

  **What to do**:
  - Create Sentry project at https://sentry.io (if not exists)
  - Get DSN from Sentry project settings
  - Get auth token from Sentry account settings (for dSYM uploads)
  - Add secrets to EAS: `eas secret:create`
  - Document the required secrets

  **Must NOT do**:
  - Do NOT commit tokens to git
  - Do NOT put tokens in app.json

  **Parallelizable**: YES (with task 3)

  **References**:
  
  **EAS Secret Commands**:
  ```bash
  # Add Sentry auth token (for dSYM uploads during build)
  eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value "your-token"
  
  # Add Sentry DSN (for app initialization)
  eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "https://xxx@xxx.ingest.sentry.io/xxx"
  ```

  **Where to get tokens**:
  - DSN: Sentry Project → Settings → Client Keys (DSN)
  - Auth Token: Sentry → Settings → Auth Tokens → Create New Token (needs `project:releases` and `org:read` scopes)

  **Acceptance Criteria**:
  - [ ] Sentry project created (or identified existing)
  - [ ] `SENTRY_AUTH_TOKEN` added to EAS secrets
  - [ ] `EXPO_PUBLIC_SENTRY_DSN` added to EAS secrets
  - [ ] Secrets verified: `eas secret:list` shows both secrets
  - [ ] Local .env.local created with same values for dev testing (not committed)

  **Commit**: NO (secrets are not in code)

---

- [ ] 5. Add test crash and verify Sentry integration

  **What to do**:
  - Add a hidden test crash button (dev only) to trigger intentional crash
  - Build with EAS and deploy to TestFlight
  - Trigger test crash on device
  - Verify crash appears in Sentry dashboard with full stack trace
  - Verify dSYMs are uploaded (native crash should be symbolicated)
  - Remove test crash button after verification

  **Must NOT do**:
  - Do NOT leave test crash in production code
  - Do NOT trigger crash in critical paths

  **Parallelizable**: NO (depends on 3, 4)

  **References**:
  
  **Test crash code** (temporary):
  ```typescript
  // Add to a dev-only screen temporarily
  import * as Sentry from '@sentry/react-native';
  
  // For JS crash:
  throw new Error("Test Sentry JS crash");
  
  // For native crash:
  Sentry.nativeCrash();
  ```

  **Verification steps**:
  1. Build: `eas build --platform ios --profile preview`
  2. Install via TestFlight
  3. Trigger crash
  4. Wait 1-2 minutes
  5. Check Sentry dashboard → Issues
  6. Verify stack trace is readable (not obfuscated)

  **Acceptance Criteria**:
  - [ ] Test crash event appears in Sentry dashboard
  - [ ] Stack trace is fully symbolicated (readable function names)
  - [ ] Native crash also appears with readable stack
  - [ ] Test crash code removed after verification
  - [ ] dSYMs visible in Sentry project settings

  **Commit**: NO (test code is temporary)

---

### Phase 3: Defensive Error Handling

- [ ] 6. Add error handling to BLETransport.ts

  **What to do**:
  - Wrap native module calls in try-catch with proper error handling
  - Add user-friendly error messages for common failures
  - Log errors to Sentry with context
  - Add timeout handling for Bluetooth operations
  - Handle Bluetooth state changes gracefully (powered off, unauthorized)

  **Must NOT do**:
  - Do NOT add automatic retry logic (out of scope)
  - Do NOT change the external BLETransport API

  **Parallelizable**: NO (depends on Sentry being set up)

  **References**:
  
  **Primary file to modify**:
  - `app/lib/networking/ble/BLETransport.ts` - Main transport class

  **Methods to add error handling**:
  - `startHosting()` - Wrap initialization and advertising
  - `stopHosting()` - Handle already-stopped gracefully
  - `joinSession()` - Wrap scan and connect with timeouts
  - `handleDisconnection()` - Log to Sentry for visibility

  **Error handling pattern**:
  ```typescript
  import * as Sentry from '@sentry/react-native';
  
  async startHosting(config: HostConfig) {
    try {
      // existing code
    } catch (error) {
      Sentry.captureException(error, {
        tags: { module: 'BLETransport', operation: 'startHosting' },
        extra: { config: { ...config, /* sanitize sensitive data */ } }
      });
      throw new BLEError('Failed to start hosting', { cause: error });
    }
  }
  ```

  **Acceptance Criteria**:
  - [ ] All public methods have try-catch with Sentry logging
  - [ ] Errors include context (operation, relevant config)
  - [ ] User-facing errors are descriptive (not raw native errors)
  - [ ] `tsc --noEmit` passes
  - [ ] Existing functionality unchanged (backward compatible)

  **Commit**: YES
  - Message: `fix(ble): add defensive error handling with Sentry logging`
  - Files: `app/lib/networking/ble/BLETransport.ts`

---

- [ ] 7. Add Sentry breadcrumbs for BLE events

  **What to do**:
  - Add breadcrumbs for key BLE lifecycle events (connect, disconnect, data sent/received)
  - Breadcrumbs help debug what happened before a crash
  - Keep breadcrumb data minimal (no large payloads)

  **Must NOT do**:
  - Do NOT log sensitive data (connection tokens, game data)
  - Do NOT add breadcrumbs in hot paths (every frame)

  **Parallelizable**: YES (with task 6, different concern)

  **References**:
  
  **Files to modify**:
  - `app/lib/networking/ble/BLETransport.ts` - Add breadcrumbs at key points

  **Breadcrumb pattern**:
  ```typescript
  import * as Sentry from '@sentry/react-native';
  
  // When client connects:
  Sentry.addBreadcrumb({
    category: 'ble',
    message: 'Client connected',
    level: 'info',
    data: { clientId: clientId.substring(0, 8) + '...' } // Truncate for privacy
  });
  ```

  **Key events to log**:
  - `startHosting` called
  - `startAdvertising` succeeded
  - Client connected/disconnected
  - `joinSession` called
  - Host found/connected
  - Connection lost

  **Acceptance Criteria**:
  - [ ] Breadcrumbs added for 6+ key BLE events
  - [ ] No sensitive data in breadcrumbs
  - [ ] Breadcrumb messages are descriptive
  - [ ] `tsc --noEmit` passes

  **Commit**: YES (can combine with task 6)
  - Message: `feat(ble): add Sentry breadcrumbs for BLE lifecycle events`
  - Files: `app/lib/networking/ble/BLETransport.ts`

---

### Phase 4: Build & Verify

- [ ] 8. EAS Build and TestFlight verification

  **What to do**:
  - Run EAS build: `eas build --platform ios --profile preview`
  - Submit to TestFlight: `eas submit --platform ios`
  - Test Bluetooth hosting flow:
    1. Fresh install (delete app to reset permissions)
    2. Open multiplayer example
    3. Click "Host Game"
    4. Accept Bluetooth permission
    5. Verify no crash
    6. Connect second device as client
    7. Verify full game sync works
  - Check Sentry for any errors during testing

  **Must NOT do**:
  - Do NOT skip the fresh install test (permissions are cached)
  - Do NOT submit to App Store (TestFlight only)

  **Parallelizable**: NO (final verification)

  **References**:
  
  **Build commands**:
  ```bash
  # Build for TestFlight
  eas build --platform ios --profile preview
  
  # Submit to TestFlight
  eas submit --platform ios --latest
  ```

  **Verification checklist**:
  1. Fresh install on physical iOS device
  2. Navigate to Bluetooth multiplayer example
  3. Click "Host Game"
  4. Accept Bluetooth permission dialog (THE CRASH POINT)
  5. Verify "Hosting..." state appears
  6. On second device, click "Join Game"
  7. Verify devices connect
  8. Play a round to verify game sync works
  9. Check Sentry dashboard for any new errors

  **Acceptance Criteria**:
  - [ ] EAS build completes successfully
  - [ ] App installs via TestFlight
  - [ ] Bluetooth permission acceptance does NOT crash
  - [ ] Host Game flow works end-to-end
  - [ ] Client can connect and play
  - [ ] No new errors in Sentry
  - [ ] dSYMs visible in Sentry (for future crashes)

  **Commit**: NO (build/deploy, not code)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `fix(ios): replace force unwraps with safe optional handling in BLE module` | BLEPeripheralModule.swift | Xcode build |
| 2 | `fix(ble): add config validation before native BLE initialization` | BLEPeripheralModule.ts, BLEPeripheralManager.ts | tsc --noEmit |
| 3 | `feat(monitoring): integrate Sentry crash reporting with Expo` | package.json, app.json, metro.config.js, _layout.tsx | tsc --noEmit |
| 6+7 | `fix(ble): add defensive error handling with Sentry logging` | BLETransport.ts | tsc --noEmit |

---

## Success Criteria

### Verification Commands
```bash
# TypeScript check
cd app && tsc --noEmit

# Build iOS
eas build --platform ios --profile preview

# Check Sentry secrets
eas secret:list
```

### Final Checklist
- [ ] Bluetooth permission acceptance does NOT crash
- [ ] Sentry dashboard shows test crash event
- [ ] dSYMs uploaded to Sentry
- [ ] Full Bluetooth hosting flow works (host + client connect)
- [ ] No hardcoded secrets in codebase
- [ ] Android build still works (no regressions)

---

## Rollback Strategy

**If Bluetooth fix breaks something:**
1. Revert commits for tasks 1-2
2. Deploy previous working build from EAS build history

**If Sentry causes issues:**
1. Remove `@sentry/react-native/expo` from app.json plugins
2. Remove Sentry.init() call from _layout.tsx
3. Rebuild - app will work without Sentry

**EAS Build History:**
```bash
# List previous builds
eas build:list --platform ios

# Resubmit old build to TestFlight
eas submit --platform ios --id <build-id>
```
