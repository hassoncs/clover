---
name: transcription-do
description: "Speech-to-text transcription and Durable Objects. Covers Whisper STT, RealtimeRelayDO, GameRepoDO, voice input, microphone, and WebSocket relay. Use when working on transcription, voice features, or real-time audio processing."
---

# Transcription & Durable Objects

> **Skill for AI Agents**: STT/Whisper, RealtimeRelayDO, GameRepoDO, voice input, WebSocket relay

## When to Use This Skill

Load when working on: transcription, speech-to-text, STT, Whisper, voice, audio recording, microphone, Durable Objects, RealtimeRelayDO, GameRepoDO, WebSocket, real-time

## Key Concepts

- **RealtimeRelayDO**: WebSocket proxy between client and OpenAI Realtime API (Whisper)
- **GameRepoDO**: Virtual Git filesystem over R2 using isomorphic-git
- **Audio Spec**: 24kHz, 16-bit PCM, Mono across all platforms
- **Platform Split**: Web uses Web Audio API, Native uses react-native-live-audio-stream

## Durable Objects

### RealtimeRelayDO (Voice/STT)
- Stateful WebSocket proxy bridging client ↔ OpenAI Realtime API
- Uses `WebSocketPair` for client connection
- 5-minute inactivity timeout via `state.storage.setAlarm`
- Auth via URL search param token, validated with Supabase service role

### GameRepoDO (Git-on-R2)
- Implements atomic Git operations (commit, branch, log) for game code
- Uses `isomorphic-git` with custom `R2Fs` filesystem adapter
- Each game gets its own DO instance keyed by gameId

## STT Flow

1. Client connects WebSocket: `GET /ws/speech-to-text?token=...`
2. `RealtimeRelayDO` opens connection to OpenAI `gpt-4o-realtime-preview`
3. Sends `session.update` with `input_audio_transcription: { model: 'whisper-1' }`
4. Client streams audio as `input_audio_buffer.append` events (PCM16 base64)
5. OpenAI returns transcript deltas and completion events
6. DO relays events back to client

## Voice Input Patterns

### Web (`audioCapture.web.ts`)
```
getUserMedia → AudioContext → ScriptProcessorNode (4096 buffer)
→ Float32 to Int16 conversion → Base64 → WebSocket
```

### Native (`audioCapture.native.ts`)
```
react-native-live-audio-stream (audioSource: 6 VOICE_RECOGNITION)
→ Base64 PCM chunks → WebSocket
```

### Unified Hook (`useSpeechToText.ts`)
- States: `idle` → `connecting` → `recording`
- Handles app backgrounding cleanup
- Returns transcript updates via callback

## Wrangler Configuration

DOs must be declared in `wrangler.toml`:
```toml
[[durable_objects.bindings]]
name = "REALTIME_RELAY"
class_name = "RealtimeRelayDO"

[[migrations]]
tag = "v1"
new_classes = ["RealtimeRelayDO"]
```

## Gotchas

- New DO classes MUST be added to both `bindings` and `migrations` in `wrangler.toml`
- WebSocket connections are limited to 5 minutes of inactivity (alarm-based timeout)
- Audio must be 24kHz/16-bit/Mono — mismatched sample rates produce garbage transcription
- `react-native-live-audio-stream` requires `audioSource: 6` for voice recognition quality
- GameRepoDO uses `isomorphic-git` — not native git; some operations have different semantics

## File References

| File | Purpose |
|------|---------|
| `api/src/agent/RealtimeRelayDO.ts` | WebSocket proxy for OpenAI Realtime |
| `api/src/durable-objects/GameRepoDO.ts` | Git-on-R2 filesystem |
| `app/lib/speech/useSpeechToText.ts` | Unified voice capture hook |
| `app/lib/speech/audioCapture.web.ts` | Web Audio API capture |
| `app/lib/speech/audioCapture.native.ts` | Native audio capture |
| `api/wrangler.toml` | DO bindings and migrations |

## Related Skills

- [agent-orchestration](agent-orchestration.md) — Chat streaming (non-voice path)
- [storage-ops](storage-ops.md) — R2 used by GameRepoDO
- [native-infrastructure](native-infrastructure.md) — Native audio permissions
