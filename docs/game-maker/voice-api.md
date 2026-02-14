# Voice Prepare/Play API

Runtime voice generation for party games. Scripts prepare phrases with a voice preset, wait for readiness, then play cached audio on demand.

## Quick Start

```javascript
// Party round: prepare all player phrases, then announce them
exports.onStart = function(ctx) {
  const phrases = ["spaghetti", "quantum physics", "my ex"];
  const handles = phrases.map(p => ctx.prepareVoice("announcer", p));

  ctx.startSequence("announce-round", async (world) => {
    await world.waitForVoices(handles);

    for (const handle of handles) {
      ctx.playVoice(handle);
      await world.wait(1500);
    }

    ctx.emit("roundComplete");
  });
};
```

## API Reference

### Sync Methods (available in all hooks)

#### `ctx.prepareVoice(voicePreset, text, opts?) → VoiceHandleId`

Starts background generation. Returns a handle ID immediately.

| Param | Type | Description |
|-------|------|-------------|
| `voicePreset` | `string` | Voice preset: `"announcer"`, `"narrator"`, `"friendly"`, `"villain"`, `"guide"` |
| `text` | `string` | Text to synthesize |
| `opts.stability` | `number` | 0-1, voice consistency (default: 0.5) |
| `opts.similarityBoost` | `number` | 0-1, voice matching (default: 0.75) |
| `opts.style` | `number` | 0-1, delivery exaggeration (default: 0) |

Duplicate calls with the same preset + text reuse the in-flight or cached generation.

#### `ctx.isVoiceReady(handleId) → boolean`

Check if a handle's audio is ready for playback.

#### `ctx.playVoice(handleId, opts?)`

Play a prepared voice clip. If the handle is not ready or failed, this is a silent no-op.

| Param | Type | Description |
|-------|------|-------------|
| `opts.volume` | `number` | Playback volume |
| `opts.pitch` | `number` | Playback pitch |

### Async Methods (sequences only)

#### `world.waitForVoices(handleIds, opts?) → Promise<VoiceWaitResult>`

Wait until all handles reach a terminal state (`ready` or `failed`).

```typescript
interface VoiceWaitResult {
  ready: string[];   // handles that completed successfully
  failed: string[];  // handles that failed
  pending: string[]; // handles still generating (only if timeout reached)
}
```

| Param | Type | Description |
|-------|------|-------------|
| `opts.timeout` | `number` | Max wait in ms (omit = wait forever) |

## Handle Lifecycle

```
prepare() → pending → ready   (generation succeeded)
                    → failed  (API error, network error)
                    → cancelled (game reset)
```

- Handles are cached per runtime session. Same text + voice = same cached audio.
- Game reset / teardown cancels all pending handles and clears the cache.

## Typical Party Game Pattern

```javascript
let phraseHandles = [];

exports.onPhaseChange = function(ctx, phase, data) {
  if (phase === "reveal") {
    const phrases = data.playerPhrases;
    phraseHandles = phrases.map(p => ctx.prepareVoice("announcer", p));

    ctx.startSequence("reveal", async (world) => {
      const result = await world.waitForVoices(phraseHandles);

      for (let i = 0; i < phraseHandles.length; i++) {
        ctx.emit("showPhrase", { index: i });
        ctx.playVoice(phraseHandles[i]);
        await world.wait(2000);
      }

      ctx.emit("revealComplete");
    });
  }
};
```

## Voice Presets

| ID | Name | Style |
|----|------|-------|
| `announcer` | Antoni | Energetic, hype |
| `narrator` | Adam | Deep, authoritative |
| `friendly` | Bella | Warm, tutorial |
| `villain` | Arnold | Gruff, menacing |
| `guide` | Rachel | Clear, calm |
