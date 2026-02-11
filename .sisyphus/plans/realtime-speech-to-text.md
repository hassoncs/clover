# Real-Time Speech-to-Text Integration

## TL;DR

> **Quick Summary**: Add real-time speech-to-text to the app via a reusable `useSpeechToText()` hook that captures microphone audio, streams it through a Cloudflare Durable Object relay to OpenAI's Realtime API, and streams transcription text back into any text input as the user speaks.
> 
> **Deliverables**:
> - `react-native-live-audio-stream` library integration (audio capture)
> - `RealtimeRelayDO` Cloudflare Durable Object (WebSocket proxy to OpenAI)
> - WebSocket upgrade route in API (`/ws/speech-to-text`)
> - `useSpeechToText()` React Native hook (reusable, configurable)
> - Mic button UI component integrated into `ChatTextArea`
> - Microphone permissions (iOS + Android)
> - TDD test suite for hook and DO
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 1 (test infra check) → Task 2 (lib install) → Task 3 (DO) → Task 5 (hook) → Task 7 (UI)

---

## Context

### Original Request
User wants real-time speech-to-text: tap a microphone icon on a text input, speak, and see words appear as they stream back from OpenAI's Realtime API. Implemented as a reusable React Native hook with a Cloudflare Durable Object acting as a WebSocket relay to keep the OpenAI API key server-side.

### Interview Summary
**Key Discussions**:
- **Architecture**: App ↔ WS ↔ Cloudflare DO ↔ WS ↔ OpenAI Realtime API (confirmed)
- **Interaction mode**: Configurable — `'toggle'` (tap on/off) or `'hold'` (press-and-hold), set per hook instance
- **Platforms**: iOS + Android from day one
- **Testing**: TDD approach
- **Audio library**: `react-native-live-audio-stream` for raw PCM chunk streaming
- **Security**: API key never leaves the server; user authenticates via Supabase session token

**Research Findings**:
- **API stack**: Hono + tRPC on Cloudflare Workers with Durable Objects
- **Existing WS pattern**: `RunCoordinatorDO` handles agent run WebSockets; `useAgentRun.ts` is the client-side template
- **Chat input**: `ChatTextArea.tsx` is the primary chat input — controlled component with `value`/`onChangeText`
- **Permissions**: Camera uses `react-native-vision-camera`; no existing mic permissions
- **No existing audio capture**: This is entirely new infrastructure

### Metis Review
**Identified Gaps (addressed)**:
- **128KB Cloudflare WS message limit**: Base64 PCM at 24kHz = ~48KB/sec. Individual `input_audio_buffer.append` messages with chunked audio stay well under the limit since `react-native-live-audio-stream` emits small buffer chunks (configurable `bufferSize`, typically 2048-4096 samples = 4-8KB before base64). Each chunk is sent as its own message. **No risk of hitting 128KB** with proper buffer sizing.
- **App backgrounding**: Must pause recording when app goes to background via AppState listener
- **Rapid start/stop**: State machine to prevent concurrent WebSocket connections
- **Session timeout**: 5-minute max to prevent runaway costs
- **DO cleanup**: Implement alarm-based idle timeout for orphaned connections
- **Audio format validation**: Verify `react-native-live-audio-stream` outputs correct format in spike task

---

## Work Objectives

### Core Objective
Enable real-time speech-to-text transcription anywhere in the app via a reusable hook that streams microphone audio through the backend to OpenAI's Realtime API.

### Concrete Deliverables
- `react-native-live-audio-stream` installed with Expo config plugin
- `api/src/agent/RealtimeRelayDO.ts` — Durable Object WebSocket relay
- WS upgrade route at `/ws/speech-to-text` in `api/src/index.ts`
- `wrangler.toml` updated with new DO binding + migration
- `app/lib/speech/useSpeechToText.ts` — reusable hook
- `app/lib/speech/types.ts` — TypeScript types for the hook
- `app/components/ui/MicButton.tsx` — mic icon button component
- `ChatTextArea.tsx` updated with mic button integration
- `Info.plist` + `AndroidManifest.xml` updated with mic permissions
- Test files for hook and DO

### Definition of Done
- [x] User can tap mic button in ChatTextArea, speak, and see words stream into the text input
- [x] Audio never leaves the device except via WebSocket to our API
- [x] OpenAI API key is never exposed to the client
- [x] Works on both iOS and Android physical devices
- [x] All TDD tests pass
- [x] 5-minute session timeout enforced
- [x] Recording pauses when app is backgrounded

### Must Have
- Configurable interaction mode (`'toggle'` | `'hold'`)
- Microphone permission request flow
- Streaming partial transcription (words appear as spoken)
- Graceful error handling (network, permissions, timeout)
- Cleanup on unmount (no leaked connections or streams)
- AppState handling (stop recording on background)

### Must NOT Have (Guardrails)
- Text-to-speech (out of scope)
- Voice commands / intent recognition (out of scope)
- On-device Whisper / local inference (cloud API only)
- Server-side audio storage or persistence (relay only)
- Web platform support (iOS + Android only)
- Audio waveform visualization (mic icon states only)
- Profanity filtering or post-processing of transcripts
- Multi-language support initially (English only, configurable later)
- Transcription history / persistence (transient per session only)

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision
- **Infrastructure exists**: YES — project uses `bun test` / vitest (verify in Task 1)
- **Automated tests**: YES (TDD — RED-GREEN-REFACTOR)
- **Framework**: Confirm in Task 1, likely `bun test` or `vitest`

### TDD Workflow Per Task

Each TODO follows RED-GREEN-REFACTOR:

**Task Structure:**
1. **RED**: Write failing test first
   - Test file created at specified path
   - Test command run → FAIL (test exists, implementation doesn't)
2. **GREEN**: Implement minimum code to pass
   - Test command run → PASS
3. **REFACTOR**: Clean up while keeping green
   - Test command run → PASS (still)

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

> Whether TDD is enabled or not, EVERY task MUST include Agent-Executed QA Scenarios.

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **Durable Object** | Bash (wrangler dev + curl/wscat) | Deploy locally, connect WS, send test audio, assert responses |
| **React Native Hook** | Bash (bun test) | Unit tests with mocked WebSocket/audio |
| **UI Component** | Playwright (playwright skill) via web or Bash (build check) | Verify component renders, mic button exists |
| **Permissions** | Bash (grep) | Verify plist/manifest contain required entries |
| **Integration** | Bash (build) | Full app builds without errors on both platforms |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Verify test infrastructure & determine framework
├── Task 2: Install react-native-live-audio-stream + permissions setup
└── Task 4: Create TypeScript types for the speech-to-text system

Wave 2 (After Wave 1):
├── Task 3: Build RealtimeRelayDO + WS upgrade route (depends: 1, 4)
└── Task 5: Build useSpeechToText hook (depends: 1, 2, 4)

Wave 3 (After Wave 2):
├── Task 6: Build MicButton component (depends: 5)
└── Task 7: Integrate mic button into ChatTextArea (depends: 5, 6)

Wave 4 (After Wave 3):
└── Task 8: End-to-end integration testing (depends: all)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3, 5 | 2, 4 |
| 2 | None | 5 | 1, 4 |
| 3 | 1, 4 | 8 | 5 |
| 4 | None | 3, 5 | 1, 2 |
| 5 | 1, 2, 4 | 6, 7, 8 | 3 |
| 6 | 5 | 7 | — |
| 7 | 5, 6 | 8 | — |
| 8 | All | None | — |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 4 | task(category="quick") for 1; task(category="unspecified-low") for 2, 4 |
| 2 | 3, 5 | task(category="ultrabrain") for both (complex WS + state machine logic) |
| 3 | 6, 7 | task(category="visual-engineering") for UI work |
| 4 | 8 | task(category="deep") for integration testing |

---

## TODOs

- [x] 1. Verify Test Infrastructure

  **What to do**:
  - Confirm which test framework is used (bun test, vitest, jest)
  - Find test config file and verify it works
  - Run existing tests to confirm they pass
  - Document the test command and config path for subsequent tasks

  **Must NOT do**:
  - Install new test frameworks
  - Modify existing test configuration

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple verification task, single-step
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 4)
  - **Blocks**: Tasks 3, 5
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `api/package.json` — Check for test scripts (`test`, `test:unit`, `test:integration`)
  - `app/package.json` — Check for test scripts
  - Look for `vitest.config.ts`, `jest.config.ts`, `bunfig.toml`, or similar

  **Acceptance Criteria**:

  - [x] Test framework identified and documented
  - [x] Test command verified working (runs existing tests, all pass)
  - [x] Config file path documented

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Test framework runs successfully
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run: cat api/package.json | grep -A5 '"scripts"'
      2. Run: cat app/package.json | grep -A5 '"scripts"'
      3. Run the identified test command (e.g., bun test, pnpm test)
      4. Assert: Exit code 0
      5. Assert: Output shows test count > 0
    Expected Result: Tests pass, framework identified
    Evidence: Terminal output captured
  ```

  **Commit**: NO (no files changed)

---

- [x] 2. Install `react-native-live-audio-stream` + Permissions Setup

  **What to do**:
  - Install `react-native-live-audio-stream` via pnpm in the `app/` workspace
  - Add `NSMicrophoneUsageDescription` to `Info.plist` with user-friendly message
  - Add `RECORD_AUDIO` permission to `AndroidManifest.xml`
  - Run `expo prebuild` to regenerate native projects if using config plugin
  - If the library needs an Expo config plugin, create one following existing patterns
  - Verify the library is properly linked on both platforms

  **Must NOT do**:
  - Install expo-av (not needed for this; we're using live-audio-stream)
  - Modify any existing native code beyond adding permissions
  - Start implementing audio capture logic (that's Task 5)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Package installation + config file edits, straightforward
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 4)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `app/package.json` — Add dependency here
  - `app/ios/Slopcade/Info.plist` — Add `NSMicrophoneUsageDescription`
  - `app/android/app/src/main/AndroidManifest.xml` — Add `RECORD_AUDIO` permission
  - `app/lib/camera/CameraTexture.native.ts:15` — Existing permission handling pattern (for reference only)

  **External References**:
  - `react-native-live-audio-stream` npm page — Installation docs
  - Expo config plugins docs — If custom plugin needed

  **Acceptance Criteria**:

  - [x] `react-native-live-audio-stream` in `app/package.json` dependencies
  - [x] `NSMicrophoneUsageDescription` present in `app/ios/Slopcade/Info.plist`
  - [x] `RECORD_AUDIO` permission present in `app/android/app/src/main/AndroidManifest.xml`
  - [x] `tsc --noEmit` passes in app workspace
  - [x] iOS build succeeds: `pnpm ios` (from repo root)

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Library installed and permissions configured
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run: grep "react-native-live-audio-stream" app/package.json
      2. Assert: Package found in dependencies
      3. Run: grep "NSMicrophoneUsageDescription" app/ios/Slopcade/Info.plist
      4. Assert: Permission string found
      5. Run: grep "RECORD_AUDIO" app/android/app/src/main/AndroidManifest.xml
      6. Assert: Permission found
      7. Run: cd app && npx tsc --noEmit
      8. Assert: Exit code 0
    Expected Result: All deps and permissions in place, types check
    Evidence: Terminal output captured

  Scenario: iOS build succeeds with new library
    Tool: Bash
    Preconditions: Library installed, permissions added
    Steps:
      1. Run: pnpm ios (from repo root)
      2. Wait for build to complete (timeout: 5min)
      3. Assert: Build succeeds (exit code 0 or "Build Succeeded" in output)
    Expected Result: App builds with new native dependency
    Evidence: Build output captured
  ```

  **Commit**: YES
  - Message: `feat(app): add react-native-live-audio-stream and microphone permissions`
  - Files: `app/package.json`, `pnpm-lock.yaml`, `Info.plist`, `AndroidManifest.xml`
  - Pre-commit: `cd app && npx tsc --noEmit`

---

- [x] 3. Build `RealtimeRelayDO` Durable Object + WebSocket Upgrade Route

  **What to do**:

  **RED (Tests First)**:
  - Create test file for `RealtimeRelayDO`
  - Test cases:
    - DO accepts WebSocket upgrade and returns 101
    - DO rejects non-WebSocket requests with 426
    - DO relays messages from client to OpenAI connection
    - DO relays messages from OpenAI to client connection
    - DO closes OpenAI connection when client disconnects
    - DO closes client connection when OpenAI disconnects
    - DO implements 5-minute session timeout via alarm
    - DO handles errors gracefully (OpenAI connection failure)

  **GREEN (Implementation)**:
  - Create `api/src/agent/RealtimeRelayDO.ts`:
    - Accept client WebSocket via `WebSocketPair`
    - Connect to OpenAI Realtime API (`wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview`)
    - Send `session.update` to configure transcription-only mode:
      ```json
      {
        "type": "session.update",
        "session": {
          "modalities": ["text"],
          "input_audio_transcription": { "model": "whisper-1" },
          "turn_detection": { "type": "server_vad" }
        }
      }
      ```
    - Relay all messages bidirectionally (client ↔ OpenAI)
    - Handle close/error on both sides
    - Set alarm for 5-minute session timeout
    - Implement `alarm()` handler to force-close after timeout
  - Add WebSocket upgrade route in `api/src/index.ts`:
    - Route: `GET /ws/speech-to-text`
    - Auth: Validate Supabase session token from query parameter
    - Create DO instance per session (use `idFromName` with user ID + timestamp)
    - Delegate to DO
  - Update `wrangler.toml`:
    - Add DO binding: `{ name = "REALTIME_RELAY", class_name = "RealtimeRelayDO" }`
    - Add migration for new class
  - Export `RealtimeRelayDO` from `api/src/index.ts`

  **Must NOT do**:
  - Store or log audio data
  - Process or transform messages (pure relay)
  - Implement client-side audio logic
  - Add rate limiting (can be added later)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Complex WebSocket relay with DO lifecycle, alarm management, bidirectional streaming
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not relevant — this is backend DO work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 5)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 1, 4

  **References**:

  **Pattern References**:
  - `api/src/agent/RunCoordinatorDO.ts` — Follow this DO class structure exactly (webSocketMessage, webSocketClose, webSocketError handlers)
  - `api/src/index.ts:38-71` — Follow this WS upgrade route pattern (Supabase token auth, DO stub delegation)
  - `api/wrangler.toml` — Add new DO binding alongside existing `RUN_COORDINATOR` binding

  **API/Type References**:
  - `api/src/trpc/context.ts` — How `c.env` bindings are typed (add `REALTIME_RELAY` binding type)

  **External References**:
  - OpenAI Realtime API docs: `https://platform.openai.com/docs/guides/realtime` — Session configuration, event types
  - Cloudflare Durable Objects WebSocket docs: `https://developers.cloudflare.com/durable-objects/api/websockets/` — WebSocketPair API, alarm API

  **WHY Each Reference Matters**:
  - `RunCoordinatorDO.ts`: Copy the DO lifecycle pattern (constructor, fetch, webSocket* handlers) — this is the canonical way DOs handle WS in this project
  - `index.ts:38-71`: Copy the auth + upgrade + DO delegation pattern — ensures consistent security model
  - `wrangler.toml`: Must add binding + migration or deployment will fail

  **Acceptance Criteria**:

  **TDD:**
  - [x] Test file created: `api/src/agent/__tests__/RealtimeRelayDO.test.ts`
  - [x] Tests cover: WS accept, relay client→OpenAI, relay OpenAI→client, close propagation, timeout alarm
  - [x] Test command → PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: DO accepts WebSocket and connects to OpenAI
    Tool: Bash (wrangler dev + wscat or node script)
    Preconditions: wrangler dev running locally
    Steps:
      1. Start: wrangler dev --local (in api/ directory)
      2. Connect: wscat -c "ws://localhost:8787/ws/speech-to-text?token=<test-token>"
      3. Assert: Connection established (101 upgrade)
      4. Send: {"type":"session.update","session":{"input_audio_transcription":{"model":"whisper-1"}}}
      5. Wait for response (timeout: 5s)
      6. Assert: Received session.created or session.updated event
    Expected Result: WebSocket connection established through DO to OpenAI
    Evidence: Terminal output showing message exchange

  Scenario: DO rejects non-WebSocket request
    Tool: Bash (curl)
    Preconditions: wrangler dev running locally
    Steps:
      1. Run: curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/ws/speech-to-text?token=<test-token>
      2. Assert: HTTP status is 426 (Upgrade Required)
    Expected Result: Non-WS request rejected
    Evidence: HTTP status code captured

  Scenario: DO rejects unauthorized request
    Tool: Bash (curl)
    Preconditions: wrangler dev running locally
    Steps:
      1. Run: curl -s -o /dev/null -w "%{http_code}" -H "Upgrade: websocket" http://localhost:8787/ws/speech-to-text
      2. Assert: HTTP status is 401
    Expected Result: Missing/invalid token rejected
    Evidence: HTTP status code captured
  ```

  **Evidence to Capture:**
  - [x] Test output showing all tests pass
  - [x] wrangler dev WebSocket connection test output

  **Commit**: YES
  - Message: `feat(api): add RealtimeRelayDO for speech-to-text WebSocket proxy`
  - Files: `api/src/agent/RealtimeRelayDO.ts`, `api/src/index.ts`, `api/wrangler.toml`, test files
  - Pre-commit: test command passes

---

- [x] 4. Create TypeScript Types for Speech-to-Text System

  **What to do**:
  - Create `app/lib/speech/types.ts` with:
    ```typescript
    // Hook configuration
    type SpeechToTextMode = 'toggle' | 'hold';
    
    type SpeechToTextConfig = {
      mode: SpeechToTextMode;
      maxDuration?: number; // ms, default 300000 (5 min)
      onTranscriptComplete?: (transcript: string) => void;
      onError?: (error: SpeechToTextError) => void;
    };
    
    // Hook return type
    type SpeechToTextState = {
      transcript: string;
      isRecording: boolean;
      isConnecting: boolean;
      isTranscribing: boolean;
      error: SpeechToTextError | null;
      startRecording: () => Promise<void>;
      stopRecording: () => Promise<void>;
      resetTranscript: () => void;
    };
    
    // Error types
    type SpeechToTextErrorCode = 
      | 'PERMISSION_DENIED'
      | 'CONNECTION_FAILED'
      | 'SESSION_TIMEOUT'
      | 'NETWORK_ERROR'
      | 'OPENAI_ERROR'
      | 'UNKNOWN';
    
    type SpeechToTextError = {
      code: SpeechToTextErrorCode;
      message: string;
    };
    
    // OpenAI Realtime API message types (subset needed for transcription)
    type RealtimeEvent = 
      | SessionUpdateEvent
      | InputAudioBufferAppendEvent
      | TranscriptionDeltaEvent
      | TranscriptionCompletedEvent
      | ErrorEvent;
    ```
  - Create `api/src/agent/types/realtime-relay.ts` with DO-side types:
    ```typescript
    type RealtimeRelayEnv = {
      OPENAI_API_KEY: string;
      // ... other bindings
    };
    ```

  **Must NOT do**:
  - Implement any logic (types only)
  - Import runtime dependencies

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Pure type definitions, no logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Tasks 3, 5
  - **Blocked By**: None

  **References**:

  **External References**:
  - OpenAI Realtime API event types: `https://platform.openai.com/docs/api-reference/realtime` — Full event type definitions

  **Acceptance Criteria**:

  - [x] `app/lib/speech/types.ts` exists with all hook types
  - [x] `api/src/agent/types/realtime-relay.ts` exists with DO types
  - [x] `tsc --noEmit` passes in both app and api workspaces

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Types compile without errors
    Tool: Bash
    Preconditions: Type files created
    Steps:
      1. Run: cd app && npx tsc --noEmit
      2. Assert: Exit code 0, no type errors
      3. Run: cd api && npx tsc --noEmit
      4. Assert: Exit code 0, no type errors
    Expected Result: All type files compile cleanly
    Evidence: Terminal output captured
  ```

  **Commit**: YES
  - Message: `feat: add TypeScript types for speech-to-text system`
  - Files: `app/lib/speech/types.ts`, `api/src/agent/types/realtime-relay.ts`
  - Pre-commit: `tsc --noEmit` in both workspaces

---

- [x] 5. Build `useSpeechToText` React Native Hook

  **What to do**:

  **RED (Tests First)**:
  - Create test file for the hook
  - Test cases:
    - Hook returns correct initial state (not recording, empty transcript, no error)
    - `startRecording` requests microphone permission
    - `startRecording` with denied permission sets PERMISSION_DENIED error
    - `startRecording` initializes audio stream with correct config (24kHz, mono, PCM16)
    - `startRecording` opens WebSocket to `/ws/speech-to-text` with auth token
    - Audio data chunks are forwarded via WebSocket as `input_audio_buffer.append`
    - `transcription.delta` events update `transcript` state
    - `transcription.completed` events call `onTranscriptComplete` callback
    - `stopRecording` stops audio stream and closes WebSocket
    - `resetTranscript` clears transcript to empty string
    - Component unmount stops recording and closes WebSocket (cleanup)
    - AppState change to 'background' stops recording
    - 5-minute timeout auto-stops recording
    - `mode: 'toggle'` — startRecording toggles on/off
    - `mode: 'hold'` — startRecording starts, stopRecording stops (no toggle)
    - Rapid start/stop doesn't create multiple connections (state machine guard)
    - WebSocket error sets CONNECTION_FAILED error state
    - Network disconnect triggers reconnection attempt (or graceful error)

  **GREEN (Implementation)**:
  - Create `app/lib/speech/useSpeechToText.ts`:
    - State machine with states: `idle` | `connecting` | `recording` | `stopping`
    - Permission request via `react-native-live-audio-stream` or `expo-av`
    - Initialize `LiveAudioStream` with config:
      ```typescript
      { sampleRate: 24000, channels: 1, bitsPerSample: 16, audioSource: 6, bufferSize: 4096 }
      ```
    - Open WebSocket to `${API_BASE_URL.replace('https', 'wss')}/ws/speech-to-text?token=${supabaseToken}`
    - On `LiveAudioStream.on('data')`: send `input_audio_buffer.append` message
    - On WS message: parse event type, update transcript for delta/completed events
    - On stop: call `LiveAudioStream.stop()`, close WebSocket
    - AppState listener: pause on background, resume on foreground (or stop)
    - Timer: 5-minute max session with auto-stop
    - Cleanup in useEffect return: stop everything

  **Must NOT do**:
  - Implement any UI (that's Tasks 6-7)
  - Store audio data locally
  - Process or modify transcription text
  - Handle push notifications or deep links

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Complex state machine, WebSocket lifecycle, audio stream coordination, AppState handling, TDD
  - **Skills**: [`test-driven-development`]
    - `test-driven-development`: Core workflow for this task
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI in this task — pure hook logic

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Tasks 6, 7, 8
  - **Blocked By**: Tasks 1, 2, 4

  **References**:

  **Pattern References**:
  - `app/components/editor/AIEditor/useAgentRun.ts:44-182` — Follow this WebSocket hook pattern exactly: useRef for WS instance, Supabase token auth, connection state tracking, cleanup on unmount
  - `app/components/editor/AIEditor/useAgentRun.ts:99-116` — Supabase token retrieval and WS auth pattern
  - `app/hooks/useAuth.tsx` — Hook naming and export convention
  - `app/lib/camera/CameraTexture.native.ts:15` — Permission request pattern (adapt for audio)

  **API/Type References**:
  - `app/lib/speech/types.ts` — Use `SpeechToTextConfig`, `SpeechToTextState`, etc. (created in Task 4)

  **External References**:
  - `react-native-live-audio-stream` API: `init()`, `start()`, `stop()`, `on('data', callback)` — Core streaming API
  - OpenAI Realtime API events: `input_audio_buffer.append`, `conversation.item.input_audio_transcription.delta`, `conversation.item.input_audio_transcription.completed`
  - React Native AppState API: `https://reactnative.dev/docs/appstate` — Background detection

  **WHY Each Reference Matters**:
  - `useAgentRun.ts`: This is THE template — same WebSocket lifecycle, same auth, same cleanup pattern. Follow it closely.
  - `types.ts`: Hook must implement these exact types for consumers
  - `CameraTexture.native.ts`: Shows how this codebase handles native permissions

  **Acceptance Criteria**:

  **TDD:**
  - [x] Test file created: `app/lib/speech/__tests__/useSpeechToText.test.ts`
  - [x] Tests cover: all test cases listed above (15+ test cases)
  - [x] Test command → PASS (all tests green)

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Hook exports correct API surface
    Tool: Bash (grep)
    Preconditions: Hook implemented
    Steps:
      1. Run: grep "export function useSpeechToText" app/lib/speech/useSpeechToText.ts
      2. Assert: Function exported
      3. Run: grep "transcript\|isRecording\|isConnecting\|startRecording\|stopRecording\|resetTranscript" app/lib/speech/useSpeechToText.ts
      4. Assert: All state/methods present
    Expected Result: Hook has correct public API
    Evidence: grep output captured

  Scenario: Hook types check cleanly
    Tool: Bash
    Preconditions: Hook and types implemented
    Steps:
      1. Run: cd app && npx tsc --noEmit
      2. Assert: Exit code 0, no type errors referencing speech/
    Expected Result: No type errors
    Evidence: tsc output captured

  Scenario: All unit tests pass
    Tool: Bash
    Preconditions: Tests and implementation complete
    Steps:
      1. Run test command for speech test file
      2. Assert: All 15+ tests pass
      3. Assert: No skipped tests
    Expected Result: Full green test suite
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(app): add useSpeechToText hook with streaming transcription`
  - Files: `app/lib/speech/useSpeechToText.ts`, `app/lib/speech/__tests__/useSpeechToText.test.ts`
  - Pre-commit: test command passes

---

- [x] 6. Build `MicButton` UI Component

  **What to do**:

  **RED (Tests First)**:
  - Create test file for MicButton
  - Test cases:
    - Renders mic icon in idle state
    - Renders active/recording state when `isRecording=true`
    - Renders connecting state when `isConnecting=true`
    - Renders error state when `error` is set
    - Calls `onPressIn` when pressed (for hold mode)
    - Calls `onPressOut` when released (for hold mode)
    - Calls `onPress` when tapped (for toggle mode)
    - Accessible: has accessibilityLabel and accessibilityRole

  **GREEN (Implementation)**:
  - Create `app/components/ui/MicButton.tsx`:
    - Props: `isRecording`, `isConnecting`, `error`, `onPress`, `onPressIn`, `onPressOut`, `mode`
    - Mic icon (use existing icon library or Ionicons)
    - Visual states:
      - Idle: default mic icon
      - Connecting: pulsing/loading indicator
      - Recording: red dot or active color indicator
      - Error: red tint with error icon
    - Pressable with haptic feedback (if available)
    - NativeWind styling consistent with existing UI components

  **Must NOT do**:
  - Import or use `useSpeechToText` directly (component receives props, stays dumb)
  - Add animation libraries not already in the project
  - Create a complex component — keep it simple

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI component with visual states
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Visual design and component patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 7
  - **Blocked By**: Task 5

  **References**:

  **Pattern References**:
  - `packages/ui/src/Input.tsx` — Base component pattern (forwardRef, NativeWind, props interface)
  - `app/components/create-game/ChatTextArea.tsx:120-140` — Send button pattern (icon button next to text input)

  **Acceptance Criteria**:

  **TDD:**
  - [x] Test file created: `app/components/ui/__tests__/MicButton.test.tsx`
  - [x] Tests cover: all visual states, press handlers, accessibility
  - [x] Test command → PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: MicButton renders with correct states
    Tool: Bash (test runner)
    Preconditions: Component and tests implemented
    Steps:
      1. Run test command for MicButton test file
      2. Assert: All tests pass
      3. Run: grep "accessibilityLabel" app/components/ui/MicButton.tsx
      4. Assert: Accessibility label present
    Expected Result: Component passes all tests and has accessibility
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(app): add MicButton component for speech-to-text`
  - Files: `app/components/ui/MicButton.tsx`, test file
  - Pre-commit: test command passes

---

- [x] 7. Integrate MicButton into ChatTextArea

  **What to do**:

  **RED (Tests First)**:
  - Add tests to existing ChatTextArea test file (or create one):
    - ChatTextArea renders MicButton when `enableSpeechToText` prop is true
    - MicButton not rendered when `enableSpeechToText` is false (default)
    - Tapping mic button starts transcription
    - Transcription text flows into the input value
    - Stopping transcription appends final text

  **GREEN (Implementation)**:
  - Update `app/components/create-game/ChatTextArea.tsx`:
    - Add optional `enableSpeechToText?: boolean` prop
    - When enabled, render `MicButton` next to the send button
    - Wire `useSpeechToText` hook:
      - `mode`: prop-configurable (default 'toggle')
      - `onTranscriptComplete`: append to current input value via `onChangeText`
    - Stream `transcript` into input as user speaks (append to existing text)
    - Show appropriate states (connecting spinner, recording indicator)
  - Handle the text flow:
    - While recording: show `existingText + transcript` in the input
    - On complete: commit the transcript into the value, reset hook

  **Must NOT do**:
  - Redesign ChatTextArea layout
  - Change existing send button behavior
  - Break existing ChatTextArea functionality
  - Add speech-to-text to other inputs (this task is ChatTextArea only)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI integration with visual feedback
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Component integration patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after Task 6)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 5, 6

  **References**:

  **Pattern References**:
  - `app/components/create-game/ChatTextArea.tsx` — The component being modified. Pay attention to:
    - `variant` prop ('fixed' vs 'bottomsheet')
    - `BottomSheetTextInput` usage
    - Send button placement (put mic button adjacent)
    - Controlled `value`/`onChangeText` pattern
  - `app/components/ui/MicButton.tsx` — The component to integrate (created in Task 6)
  - `app/lib/speech/useSpeechToText.ts` — The hook to wire up (created in Task 5)

  **Acceptance Criteria**:

  **TDD:**
  - [x] Tests cover: MicButton rendering, transcription flow, text integration
  - [x] Test command → PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: MicButton appears in ChatTextArea when enabled
    Tool: Bash (grep + test)
    Preconditions: All components built
    Steps:
      1. Run: grep "enableSpeechToText" app/components/create-game/ChatTextArea.tsx
      2. Assert: Prop defined
      3. Run: grep "MicButton" app/components/create-game/ChatTextArea.tsx
      4. Assert: MicButton imported and rendered
      5. Run test command
      6. Assert: All tests pass
    Expected Result: MicButton conditionally renders in ChatTextArea
    Evidence: Test and grep output

  Scenario: TypeScript types check cleanly
    Tool: Bash
    Preconditions: Integration complete
    Steps:
      1. Run: cd app && npx tsc --noEmit
      2. Assert: Exit code 0
    Expected Result: No type errors from integration
    Evidence: tsc output
  ```

  **Commit**: YES
  - Message: `feat(app): integrate speech-to-text mic button into ChatTextArea`
  - Files: `app/components/create-game/ChatTextArea.tsx`, test files
  - Pre-commit: `tsc --noEmit` + test command

---

- [x] 8. End-to-End Integration Testing

  **What to do**:
  - Verify the full pipeline works end-to-end:
    1. API deploys with new DO (or runs locally via `wrangler dev`)
    2. App connects via WebSocket
    3. Audio streams through DO to OpenAI
    4. Transcription events flow back to app
  - Run full test suites for both app and API
  - Verify `tsc --noEmit` passes in all workspaces
  - Verify app builds on both iOS and Android
  - Document any manual testing needed on physical devices (audio capture on simulators is unreliable)

  **Must NOT do**:
  - Implement new features
  - Refactor existing code
  - Change any behavior — this is verification only

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Thorough integration verification across full stack
  - **Skills**: [`verification-before-completion`]
    - `verification-before-completion`: Ensures evidence-based completion

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (final)
  - **Blocks**: None
  - **Blocked By**: All previous tasks

  **References**:

  **All files created in Tasks 1-7** — verify they exist and work together.

  **Acceptance Criteria**:

  - [x] All unit tests pass (app + api)
  - [x] `tsc --noEmit` passes in all workspaces
  - [x] iOS app builds successfully
  - [x] Android app builds successfully
  - [x] API deploys/runs with new DO successfully
  - [x] WebSocket connection can be established to `/ws/speech-to-text`

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Full test suite passes
    Tool: Bash
    Preconditions: All tasks complete
    Steps:
      1. Run: cd api && [test command]
      2. Assert: All tests pass
      3. Run: cd app && [test command]
      4. Assert: All tests pass
    Expected Result: Zero test failures
    Evidence: Full test output captured

  Scenario: TypeScript compiles across all workspaces
    Tool: Bash
    Preconditions: All code written
    Steps:
      1. Run: cd api && npx tsc --noEmit
      2. Assert: Exit code 0
      3. Run: cd app && npx tsc --noEmit
      4. Assert: Exit code 0
    Expected Result: Zero type errors
    Evidence: tsc output captured

  Scenario: WebSocket endpoint accessible
    Tool: Bash
    Preconditions: API running (wrangler dev)
    Steps:
      1. Start: wrangler dev in api/
      2. Run: curl -s -o /dev/null -w "%{http_code}" -H "Upgrade: websocket" http://localhost:8787/ws/speech-to-text?token=test
      3. Assert: Response indicates WebSocket upgrade possible
    Expected Result: Endpoint exists and handles requests
    Evidence: curl output captured
  ```

  **Commit**: NO (verification only, no code changes)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 2 | `feat(app): add react-native-live-audio-stream and microphone permissions` | package.json, plist, manifest | tsc --noEmit |
| 3 | `feat(api): add RealtimeRelayDO for speech-to-text WebSocket proxy` | DO file, index.ts, wrangler.toml, tests | API tests pass |
| 4 | `feat: add TypeScript types for speech-to-text system` | types files | tsc --noEmit |
| 5 | `feat(app): add useSpeechToText hook with streaming transcription` | hook + tests | All hook tests pass |
| 6 | `feat(app): add MicButton component for speech-to-text` | component + tests | Component tests pass |
| 7 | `feat(app): integrate speech-to-text mic button into ChatTextArea` | ChatTextArea update + tests | All tests + tsc |

---

## Success Criteria

### Verification Commands
```bash
# All API tests pass
cd api && bun test          # Expected: all pass

# All app tests pass
cd app && bun test           # Expected: all pass

# TypeScript compiles
cd api && npx tsc --noEmit   # Expected: exit 0
cd app && npx tsc --noEmit   # Expected: exit 0

# Key files exist
ls app/lib/speech/useSpeechToText.ts      # Expected: exists
ls app/lib/speech/types.ts                 # Expected: exists
ls app/components/ui/MicButton.tsx          # Expected: exists
ls api/src/agent/RealtimeRelayDO.ts        # Expected: exists

# Permissions configured
grep "NSMicrophoneUsageDescription" app/ios/Slopcade/Info.plist    # Expected: found
grep "RECORD_AUDIO" app/android/app/src/main/AndroidManifest.xml   # Expected: found

# DO registered
grep "RealtimeRelayDO" api/wrangler.toml   # Expected: found
```

### Final Checklist
- [x] All "Must Have" present
- [x] All "Must NOT Have" absent
- [x] All TDD tests pass
- [x] TypeScript compiles in all workspaces
- [x] iOS + Android builds succeed
- [x] Hook is reusable (not coupled to ChatTextArea)
- [x] API key never exposed to client
- [x] 5-minute session timeout enforced
- [x] App backgrounding stops recording
