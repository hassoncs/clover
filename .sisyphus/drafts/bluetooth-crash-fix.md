# Draft: Bluetooth Permission Crash Fix & Crash Reporting

## Requirements (confirmed from user request)

### Problem Statement
- iOS TestFlight build crashes immediately after user accepts Bluetooth permission dialog
- Crash occurs when "Host Game" is clicked in Bluetooth multiplayer example
- No crash logs currently available to confirm root cause

### Phases Requested
1. **IMMEDIATE**: Get crash logs from current TestFlight build
2. **SHORT-TERM**: Fix the crash in `BLEPeripheralModule.swift`
3. **MEDIUM-TERM**: Integrate Sentry for future crash reporting
4. **LONG-TERM**: Add defensive error handling throughout Bluetooth stack

## Technical Decisions

### Confirmed Root Causes (from code analysis)

**File**: `app/ios/Slopcade/BLEPeripheralModule.swift` (388 lines)

#### 1. Threading: LIKELY NOT THE ISSUE
- `requiresMainQueueSetup()` returns `false` (line 34-36)
- BUT `CBPeripheralManager` is created with `queue: nil` (line 66), which defaults to **main queue**
- So delegate callbacks already arrive on main thread - this is correct

#### 2. Promise Resolver Race Condition: **CONFIRMED HIGH RISK**
- `initializeResolver` and `initializeRejecter` stored as instance properties (lines 23-24)
- In `peripheralManagerDidUpdateState` (lines 195-225):
  - On `.poweredOn`: calls `initializeResolver?(nil)` then sets to `nil` (lines 199-201)
  - On error states: calls `initializeRejecter?` then sets to `nil` (lines 204-216)
- **CRASH SCENARIO**: If `peripheralManagerDidUpdateState` is called TWICE rapidly:
  1. First call: Resolves promise, sets resolver to nil
  2. Second call: `initializeResolver` is now nil - no crash here (safe optional)
  - BUT: If user rapidly toggles Bluetooth, the second initialize() call might be queued while first is still running
- **MORE LIKELY CRASH**: iOS might call delegate during deallocating if module is destroyed before callback

#### 3. Event Emitter Before hasListeners: **CONFIRMED RISK**
- `sendEvent` is guarded by `if hasListeners` in most places (lines 151-153, 164-167, 222-224, 312-317, 327-329, 362-367, 370-375)
- But `hasListeners` is only set to `true` in `startObserving()` which is called by RN when JS adds a listener
- **TIMING ISSUE**: If `peripheralManagerDidUpdateState` fires BEFORE JS has added listeners, `hasListeners` is false and event is dropped (not a crash, but lost events)

#### 4. Force Unwrap in setupService: **CONFIRMED CRASH RISK** ⚠️
Lines 278-285 use force unwraps:
```swift
service?.characteristics = [
  gameStateCharacteristic!,  // Force unwrap - crashes if nil
  playerInputCharacteristic!,
  sessionInfoCharacteristic!,
  controlCharacteristic!
]
peripheralManager.add(service!)  // Force unwrap - crashes if nil
```
If any characteristic UUID from config is invalid/empty, the CBUUID creation might fail silently and the characteristic would be nil, causing crash.

### JS-Side Analysis (from explore agent)

**Files analyzed**:
- `app/lib/networking/ble/BLETransport.ts` - High-level transport
- `app/lib/networking/ble/BLEPeripheralManager.ts` - Abstraction layer
- `app/lib/networking/native/BLEPeripheralModule.ts` - Native bridge

**Findings**:
- Error handling is promise-based but "thin"
- No retry logic for connection/advertising failures
- `NativeEventEmitter` listeners set up during initialize - potential race with native events

### Info.plist Status
- All required Bluetooth permissions present ✅
- Background modes configured correctly ✅

### Sentry Integration Research (from librarian agent)

**Modern Expo Setup (SDK 50+)**:
1. `npx @sentry/wizard@latest -i reactNative` (auto-setup)
2. Or manual: `npx expo install @sentry/react-native`
3. Config plugin in app.json/app.config.js
4. Metro config with `getSentryExpoConfig`
5. EAS Build needs `SENTRY_AUTH_TOKEN` in secrets
6. Native crashes captured automatically with `enableNative: true`
7. dSYMs uploaded automatically during EAS Build

## Constraints (from user)
- Must maintain existing Bluetooth functionality (host + client modes)
- Cannot break working Android implementation
- Must work with Expo managed workflow (no ejecting)
- TestFlight builds via EAS Build

## Open Questions
1. Does user have access to App Store Connect to retrieve existing crash logs?
2. Is there a preference for crash reporting solution (Sentry vs alternatives)?
3. What's the timeline urgency for each phase?
4. Are there any existing error handling patterns in the codebase to follow?

## Scope Boundaries
- INCLUDE: iOS crash fix, crash reporting integration, Bluetooth error handling
- EXCLUDE: Android changes (unless required for parity), new Bluetooth features
