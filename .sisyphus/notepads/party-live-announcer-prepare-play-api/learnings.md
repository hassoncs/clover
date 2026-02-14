## Wave 1, Task 1: Voice Handle Type Contract

### Files Created
- `shared/src/types/voice-handle.ts` - Core voice handle types

### Files Modified
- `shared/src/types/sync-world-ops.ts` - Added prepareVoice, isVoiceReady, playVoice
- `shared/src/types/async-world-ops.ts` - Added waitForVoices
- `shared/src/types/index.ts` - Exported voice-handle types

### Type Contract Design
- `VoiceHandleId` = string (opaque identifier)
- `VoicePrepareStatus` = pending | ready | failed | cancelled
- `VoicePrepareOptions` = stability, similarityBoost, style, useSpeakerBoost
- `VoiceHandle` = full handle with id, phrase, status, error?, assetUrl?
- `VoiceWaitResult` = categorizes handles by final status (ready/failed/pending)

### API Surface
**Sync (ScriptContext):**
- `prepareVoice(voicePreset, text, opts?) -> VoiceHandleId` - Returns immediately
- `isVoiceReady(handleId) -> boolean` - Check status
- `playVoice(handleId, opts?) -> void` - Safe no-op if not ready

**Async (worldAsync):**
- `waitForVoices(handleIds, opts?) -> Promise<VoiceWaitResult>` - Wait for completion

### Deterministic Behavior
- playVoice on non-ready handle = safe no-op + diagnostic event
- playVoice on failed handle = safe no-op
- Cache key = (voicePreset + normalizedText + voiceOptions hash)

### ScriptContext Inheritance
- ScriptContext extends SyncWorldOps, so voice methods automatically available
- worldAsync property typed as AsyncWorldOps, so waitForVoices automatically available
- No changes needed to app/lib/scripting/types.ts

### Type-Check Status
✅ All packages pass type-check
