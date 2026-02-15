# Learnings

## 2026-02-15 Initial Exploration

### Server-Side Templates
- Templates: `quiplash.ts`, `crowd-comedy.ts`, `question-answer.ts`, `registry.ts`
- Duplicated utils: `shuffle`, `delay`, `startCountdown`, `buildScoreboard` (identical in quiplash + crowd-comedy)
- `generateId()` only in crowd-comedy but useful for all
- `utils.ts` does NOT exist yet — needs creation
- Existing tests: `__tests__/quiplash.test.ts`, `__tests__/crowd-comedy.test.ts`

### PartyRoomDO
- Has `requestInput()` — broadcasts to ALL players
- Missing: `sendToPlayer` (targeted send)
- Missing: `requestInputFromSubset` (subset targeting)
- Key methods: `setPhase`, `updatePlayerScore`, `updateSharedData`, `requestInput`

### Protocol & Types
- `PartyRoomPhase`: `"lobby" | "playing" | "ended"` (sub-phases via sharedData)
- `PartyInputRequest`: has `type`, `prompt`, `timeLimit`, `options`, `metadata`
- Protocol message types: `input_request`, `input_response`, `phase_change`, etc.

## 2026-02-15 Utils Extraction

### Circular Dependency Issue
- Pre-existing circular dependency: `PartyRoomDO.ts` → `templates/registry.ts` → templates → `PartyRoomDO.ts`
- Caused by templates importing `DEFAULT_ANSWER_TIMEOUT` and `DEFAULT_VOTE_TIMEOUT` from `PartyRoomDO.ts`
- Fix: Define constants locally in templates (30s answer, 15s vote)
- Fix: Use minimal `CountdownRoom` interface in utils.ts instead of importing `PartyTemplateRunner`

### Utils Module Structure
- Created `api/src/party/templates/utils.ts` with:
  - `ScoreEntry` interface (exported)
  - `shuffle<T>(arr: T[]): T[]`
  - `delay(ms: number): Promise<void>`
  - `generateId(): string`
  - `startCountdown(room: CountdownRoom, seconds: number)`
  - `buildScoreboard(scores, playerNames): ScoreEntry[]`

### Test Runner
- Use `npx vitest run` from `api/` directory, not `bun test`
- `bun test` doesn't support `vi.runAllTimersAsync()` properly

## 2026-02-15 Content Loader Abstraction

### Generic Content Loader Pattern
- Created `prompt-loader.ts` with type-safe content loading by game type
- `ContentType`: union of all supported game types (quip, trivia, drawing, wyr, estimation, fibbage, caption, wordgame)
- `ContentTypeMap`: maps content types to their TypeScript types from `@slopcade/content-pipeline`
- `loadContentPack<T>(type: T)`: generic loader returning typed content array
- `hasContentPack(type)`: checks if content pack exists
- `getAvailableContentTypes()`: returns list of loaded content types

### Backward Compatibility
- Kept `loadPromptPool()` as alias for `loadContentPack("quip")`
- Kept `QuiplashPrompt` interface for legacy code
- `shufflePrompts` and `selectPromptsForRound` now generic over `{ id: string }`

### Content Pipeline Integration
- Types imported from `@slopcade/content-pipeline` (main export, not `/types` subpath)
- Content pipeline exports all types via `export * from "./types/index.js"`
- JSON content files stored in `api/src/party/content/`
- Only `quiplash-prompts.json` exists currently; other types will be added via `build-pack` command

### Template Updates
- Both `quiplash.ts` and `crowd-comedy.ts` now use `loadPromptPool()` from shared loader
- Removed direct JSON imports from templates
- Templates use `type Prompt = QuiplashPrompt` for local type alias

## 2026-02-15 Private State Targeting

### PartyRoomDO Targeted Messaging
- Added `sendToPlayer(playerId, data)` in `PartyRoomDO` to send a `private_state` message only to sockets where metadata is `{ role: "player", playerId }`
- Method is a graceful no-op when no matching player socket exists (no throw/crash)

### Protocol Extension
- Added `private_state` to protocol validation (`VALID_MESSAGE_TYPES`)
- Added `privateStateMessage(data)` factory with shape `{ type: "private_state", data }`
- Added `PrivateStateMessage` to shared `PartyMessage` union

### Test Pattern
- Added isolated `PartyRoomDO.sendToPlayer` tests by injecting mocked sockets + metadata directly into private maps/sets
- Verified target player receives payload, non-target player and host do not, and missing player ID is handled safely

## 2026-02-15 Buzzer Input Component

### Reusable Buzzer Component
- Created `BuzzerInput` as a reusable component for party games.
- Integrated into `play.tsx` by checking `activeInputRequest.request.type === "buzzer"`.
- This allows the buzzer to be used in any game phase where input is requested.
- Uses `NativeWind` for styling and `Ionicons` for visual feedback.
