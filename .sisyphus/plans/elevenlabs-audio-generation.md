# ElevenLabs Voice & Audio Generation Integration

## TL;DR

Build a unified ElevenLabs proxy service supporting SFX, background sounds, and voice generation. Expose via API routes, wrap in reusable utilities, register as MCP tools for chat integration, and hook into billing.

**Key Deliverables:**
- Unified `ElevenLabsService` utility (SFX + voice + background sounds)
- API routes: `/api/audio/generate-sfx`, `/api/audio/generate-voice`
- MCP tools: `generate_sound_effect`, `generate_voice`, `generate_background_sound`
- Editor integration: Generated files appear in asset list, previewable
- Billing integration: Track and bill for generations

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ELEVENLABS PROXY                             │
│                                                                       │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│   │  SFX Generation │    │ Voice Generation│    │ Background Sound│  │
│   │  (sound-effects)│    │    (TTS)        │    │   (SFX w/ loop) │  │
│   └────────┬────────┘    └────────┬────────┘    └────────┬────────┘  │
│            │                      │                      │           │
│            └──────────────────────┼──────────────────────┘           │
│                                   │                                  │
│                        ┌──────────▼──────────┐                      │
│                        │  ElevenLabsService  │                      │
│                        │    (utility)        │                      │
│                        └──────────┬──────────┘                      │
│                                   │                                  │
│                        ┌──────────▼──────────┐                      │
│                        │  ElevenLabs Client  │                      │
│                        │   (elevenlabs SDK)  │                      │
│                        └──────────┬──────────┘                      │
│                                   │                                  │
│                        ┌──────────▼──────────┐                      │
│                        │  ElevenLabs API     │                      │
│                        │  (api.elevenlabs.io)│                      │
│                        └─────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│  API Routes   │          │  MCP Tools    │          │  CLI Scripts  │
│  (CF Worker)  │          │  (Chat tools) │          │  (Manual use) │
└───────────────┘          └───────────────┘          └───────────────┘
```

---

## 2. ElevenLabsService Utility

### Location
`api/src/services/ElevenLabsService.ts`

### Interface

```typescript
export interface GenerateSFXOptions {
  text: string;                    // Description of sound
  durationSeconds?: number;        // 0.5 - 30 seconds
  promptInfluence?: number;        // 0.0 - 1.0
  outputFormat?: 'mp3' | 'wav';
}

export interface GenerateVoiceOptions {
  text: string;                    // Text to speak
  voiceId: string;                 // ElevenLabs voice ID
  model?: 'eleven_flash_v2_5' | 'eleven_turbo_v2_5' | 'eleven_multilingual_v2';
  stability?: number;              // 0.0 - 1.0
  similarityBoost?: number;        // 0.0 - 1.0
  outputFormat?: 'mp3_44100_128' | 'mp3_44100_64' | 'pcm_16000';
}

export interface GenerateBackgroundOptions {
  text: string;                    // Description of ambient sound/music
  durationSeconds: number;         // Longer duration for background
  promptInfluence?: number;
  loop?: boolean;                  // Whether to loop
}

export interface GenerationResult {
  audioBuffer: ArrayBuffer;
  contentType: string;
  metadata: {
    type: 'sfx' | 'voice' | 'background';
    prompt: string;
    duration?: number;
    voiceId?: string;
    model?: string;
    generatedAt: string;
  };
}

export class ElevenLabsService {
  constructor(apiKey: string);
  
  generateSFX(options: GenerateSFXOptions): Promise<GenerationResult>;
  generateVoice(options: GenerateVoiceOptions): Promise<GenerationResult>;
  generateBackground(options: GenerateBackgroundOptions): Promise<GenerationResult>;
  
  // Utility methods
  getVoicePresets(): VoicePreset[];
  estimateCost(options: GenerateVoiceOptions | GenerateSFXOptions): number;
}
```

### Implementation

```typescript
import { ElevenLabsClient } from 'elevenlabs';

export class ElevenLabsService {
  private client: ElevenLabsClient;
  
  constructor(apiKey: string) {
    this.client = new ElevenLabsClient({ apiKey });
  }
  
  async generateSFX(options: GenerateSFXOptions): Promise<GenerationResult> {
    const audio = await this.client.textToSoundEffects.convert({
      text: options.text,
      duration_seconds: options.durationSeconds ?? 2.0,
      prompt_influence: options.promptInfluence ?? 0.5,
    });
    
    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);
    
    return {
      audioBuffer,
      contentType: 'audio/mpeg',
      metadata: {
        type: 'sfx',
        prompt: options.text,
        duration: options.durationSeconds,
        generatedAt: new Date().toISOString(),
      },
    };
  }
  
  async generateVoice(options: GenerateVoiceOptions): Promise<GenerationResult> {
    const audio = await this.client.textToSpeech.convert(options.voiceId, {
      text: options.text,
      model_id: options.model ?? 'eleven_multilingual_v2',
      output_format: options.outputFormat ?? 'mp3_44100_128',
      voice_settings: {
        stability: options.stability ?? 0.5,
        similarity_boost: options.similarityBoost ?? 0.75,
      },
    });
    
    const chunks: Uint8Array[] = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);
    
    return {
      audioBuffer,
      contentType: 'audio/mpeg',
      metadata: {
        type: 'voice',
        prompt: options.text,
        voiceId: options.voiceId,
        model: options.model,
        generatedAt: new Date().toISOString(),
      },
    };
  }
  
  async generateBackground(options: GenerateBackgroundOptions): Promise<GenerationResult> {
    // Background sounds use SFX API with longer duration
    const audio = await this.client.textToSoundEffects.convert({
      text: options.text,
      duration_seconds: options.durationSeconds,
      prompt_influence: options.promptInfluence ?? 0.5,
    });
    
    const chunks: Uint8Array[] = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);
    
    return {
      audioBuffer,
      contentType: 'audio/mpeg',
      metadata: {
        type: 'background',
        prompt: options.text,
        duration: options.durationSeconds,
        loop: options.loop,
        generatedAt: new Date().toISOString(),
      },
    };
  }
  
  getVoicePresets(): VoicePreset[] {
    return Object.values(VOICE_PRESETS);
  }
  
  estimateCost(options: GenerateVoiceOptions | GenerateSFXOptions): number {
    // Rough cost estimation for billing
    if ('text' in options && 'voiceId' in options) {
      // Voice: ~0.5 credits per character (Flash) to 1 credit (Multilingual)
      const chars = options.text.length;
      const multiplier = options.model?.includes('flash') ? 0.5 : 1.0;
      return chars * multiplier;
    } else {
      // SFX: ~1 credit per generation
      return 1;
    }
  }
}
```

---

## 3. API Routes

### Routes to Add

```typescript
// api/src/index.ts

// Audio generation routes (all require authentication)
app.post('/api/audio/generate-sfx', handleGenerateSFX);
app.post('/api/audio/generate-voice', handleGenerateVoice);
app.post('/api/audio/generate-background', handleGenerateBackground);
app.get('/api/audio/voice-presets', handleGetVoicePresets);
```

### Route Handlers

```typescript
// api/src/routes/audio.ts

import { ElevenLabsService } from '../services/ElevenLabsService';
import { trackGeneration } from '../billing/generationTracker';

export async function handleGenerateSFX(c: Context) {
  const user = c.get('user');
  const { text, durationSeconds, promptInfluence } = await c.req.json();
  
  // Validate
  if (!text || text.length < 5) {
    return c.json({ error: 'Text description required (min 5 chars)' }, 400);
  }
  
  // Initialize service
  const service = new ElevenLabsService(c.env.ELEVENLABS_API_KEY);
  
  // Generate
  const result = await service.generateSFX({
    text,
    durationSeconds,
    promptInfluence,
  });
  
  // Save to R2
  const assetId = `sfx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const r2Key = `generated/${user.id}/${assetId}.mp3`;
  
  await c.env.ASSETS.put(r2Key, result.audioBuffer, {
    httpMetadata: { contentType: result.contentType },
    customMetadata: {
      ...result.metadata,
      userId: user.id,
      assetId,
    },
  });
  
  // Track for billing
  await trackGeneration({
    userId: user.id,
    type: 'sfx',
    cost: service.estimateCost({ text, durationSeconds }),
    metadata: result.metadata,
  });
  
  const url = `https://${c.env.ASSETS_BUCKET}.r2.cloudflarestorage.com/${r2Key}`;
  
  return c.json({
    success: true,
    assetId,
    url,
    metadata: result.metadata,
  });
}

export async function handleGenerateVoice(c: Context) {
  const user = c.get('user');
  const { text, voiceId, model, stability, similarityBoost } = await c.req.json();
  
  // Validate
  if (!text || text.length > 5000) {
    return c.json({ error: 'Text required, max 5000 characters' }, 400);
  }
  if (!voiceId) {
    return c.json({ error: 'voiceId required' }, 400);
  }
  
  const service = new ElevenLabsService(c.env.ELEVENLABS_API_KEY);
  
  const result = await service.generateVoice({
    text,
    voiceId,
    model,
    stability,
    similarityBoost,
  });
  
  const assetId = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const r2Key = `generated/${user.id}/${assetId}.mp3`;
  
  await c.env.ASSETS.put(r2Key, result.audioBuffer, {
    httpMetadata: { contentType: result.contentType },
    customMetadata: {
      ...result.metadata,
      userId: user.id,
      assetId,
    },
  });
  
  await trackGeneration({
    userId: user.id,
    type: 'voice',
    cost: service.estimateCost({ text, voiceId, model }),
    metadata: result.metadata,
  });
  
  const url = `https://${c.env.ASSETS_BUCKET}.r2.cloudflarestorage.com/${r2Key}`;
  
  return c.json({
    success: true,
    assetId,
    url,
    metadata: result.metadata,
  });
}

export async function handleGetVoicePresets(c: Context) {
  const service = new ElevenLabsService(c.env.ELEVENLABS_API_KEY);
  return c.json({ presets: service.getVoicePresets() });
}
```

---

## 4. MCP Tools for Chat Integration

### Tool Definitions

```typescript
// Register in MCP server configuration

export const audioGenerationTools = [
  {
    name: 'generate_sound_effect',
    description: 'Generate a sound effect from a text description using ElevenLabs',
    parameters: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Text description of the sound effect (e.g., "game show buzzer, wrong answer")',
        },
        duration: {
          type: 'number',
          description: 'Duration in seconds (0.5 - 30, default: 2)',
          minimum: 0.5,
          maximum: 30,
        },
        gameId: {
          type: 'string',
          description: 'Game ID to associate the sound with',
        },
      },
      required: ['description'],
    },
  },
  {
    name: 'generate_voice',
    description: 'Generate voice audio from text using ElevenLabs TTS',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text to speak (max 5000 characters)',
        },
        voicePreset: {
          type: 'string',
          description: 'Voice preset name (e.g., "game-show-host", "friendly-female")',
          enum: ['game-show-host', 'friendly-female', 'british-narrator', 'spooky-male'],
        },
        gameId: {
          type: 'string',
          description: 'Game ID to associate the voice with',
        },
      },
      required: ['text', 'voicePreset'],
    },
  },
  {
    name: 'generate_background_sound',
    description: 'Generate background ambient sound or music',
    parameters: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Description of ambient sound (e.g., "soft jazz lounge music, loopable")',
        },
        duration: {
          type: 'number',
          description: 'Duration in seconds (5 - 30, default: 10)',
          minimum: 5,
          maximum: 30,
        },
        loop: {
          type: 'boolean',
          description: 'Whether this should loop (adds loop metadata)',
          default: true,
        },
        gameId: {
          type: 'string',
          description: 'Game ID to associate the sound with',
        },
      },
      required: ['description'],
    },
  },
];
```

### Tool Implementation

```typescript
// MCP tool handlers

export async function handleGenerateSoundEffect(args: {
  description: string;
  duration?: number;
  gameId?: string;
}) {
  // Call internal API
  const response = await fetch('/api/audio/generate-sfx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: args.description,
      durationSeconds: args.duration,
    }),
  });
  
  const result = await response.json();
  
  if (!result.success) {
    return {
      content: [{ type: 'text', text: `Failed to generate sound: ${result.error}` }],
      isError: true,
    };
  }
  
  return {
    content: [
      { type: 'text', text: `✅ Generated sound effect: ${args.description}` },
      { type: 'text', text: `Asset ID: ${result.assetId}` },
      { type: 'text', text: `URL: ${result.url}` },
    ],
  };
}

export async function handleGenerateVoice(args: {
  text: string;
  voicePreset: string;
  gameId?: string;
}) {
  // Map preset to voice ID
  const voiceId = VOICE_PRESETS[args.voicePreset]?.voiceId;
  if (!voiceId) {
    return {
      content: [{ type: 'text', text: `Unknown voice preset: ${args.voicePreset}` }],
      isError: true,
    };
  }
  
  const response = await fetch('/api/audio/generate-voice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: args.text,
      voiceId,
    }),
  });
  
  const result = await response.json();
  
  return {
    content: [
      { type: 'text', text: `✅ Generated voice: "${args.text.slice(0, 50)}..."` },
      { type: 'text', text: `Voice: ${args.voicePreset}` },
      { type: 'text', text: `Asset ID: ${result.assetId}` },
    ],
  };
}
```

---

## 5. Editor Integration

### Asset List Integration

Generated sounds appear in the editor's sound list automatically:

```typescript
// Editor sound list component

interface SoundListItem {
  id: string;
  name: string;
  url: string;
  type: 'sfx' | 'voice' | 'background' | 'uploaded';
  metadata?: {
    prompt?: string;
    voiceId?: string;
    duration?: number;
  };
}

function SoundAssetList({ gameId }: { gameId: string }) {
  const [sounds, setSounds] = useState<SoundListItem[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  
  useEffect(() => {
    // Fetch from R2 listing or API
    fetch(`/api/games/${gameId}/sounds`).then(r => r.json()).then(setSounds);
  }, [gameId]);
  
  const playSound = (sound: SoundListItem) => {
    const audio = new Audio(sound.url);
    audio.play();
    setPlayingId(sound.id);
    audio.onended = () => setPlayingId(null);
  };
  
  return (
    <div className="sound-list">
      {sounds.map(sound => (
        <div key={sound.id} className={`sound-item ${sound.type}`}>
          <span className="sound-icon">
            {sound.type === 'voice' &>; '🎙️'}
            {sound.type === 'sfx' &>; '🔊'}
            {sound.type === 'background' &>; '🎵'}
          </span>
          
          <span className="sound-name">{sound.name}</span>
          
          {sound.metadata?.prompt &>; (
            <span className="sound-prompt" title={sound.metadata.prompt}>
              "{sound.metadata.prompt.slice(0, 30)}..."
            </span>
          )}
          
          <button onClick={() => playSound(sound)}>
            {playingId === sound.id ? '⏹️' : '▶️'}
          </button>
          
          <button onClick={() => assignToRule(sound.id)}>
            Use in Rule
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Rule Action Integration

Already exists — just use the `sound` action:

```typescript
// When creating a rule action
{
  type: 'sound',
  soundId: 'voice-12345',  // Generated voice asset ID
  volume: 1.0,
}
```

---

## 6. Billing Integration

### Generation Tracking

```typescript
// api/src/billing/generationTracker.ts

interface GenerationRecord {
  id: string;
  userId: string;
  type: 'sfx' | 'voice' | 'background';
  cost: number;           // In credits or internal units
  metadata: object;
  createdAt: string;
}

export async function trackGeneration(record: Omit<GenerationRecord, 'id' | 'createdAt'>) {
  // Store in D1
  const db = getDb();
  await db
    .prepare(`
      INSERT INTO generations (id, user_id, type, cost, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .bind(
      crypto.randomUUID(),
      record.userId,
      record.type,
      record.cost,
      JSON.stringify(record.metadata),
      new Date().toISOString()
    )
    .run();
  
  // Update user's generation quota
  await updateGenerationQuota(record.userId, record.cost);
}

async function updateGenerationQuota(userId: string, cost: number) {
  // Check if user has available quota
  // Update usage tracking
  // Trigger warnings if approaching limit
}
```

### Database Schema

```sql
-- Add to D1 schema
CREATE TABLE generations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'sfx', 'voice', 'background'
  cost REAL NOT NULL,  -- Credit cost
  metadata TEXT,       -- JSON
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_generations_user ON generations(user_id, created_at);
```

---

## 7. Testing Plan

### Manual API Test

```bash
# Test SFX generation
curl -X POST https://api.slopcade.com/api/audio/generate-sfx \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "text": "game show buzzer, wrong answer",
    "durationSeconds": 1.5
  }'

# Test voice generation
curl -X POST https://api.slopcade.com/api/audio/generate-voice \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "text": "Hello and welcome to the game!",
    "voiceId": "JBFqnCBsd6RMkjVDRZzb"
  }'

# Test background sound
curl -X POST https://api.slopcade.com/api/audio/generate-background \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "text": "soft jazz lounge music, loopable background",
    "durationSeconds": 15,
    "loop": true
  }'
```

### Verification Steps

1. **API connectivity:** All three endpoints return 200 with audio URL
2. **Audio playback:** Generated URLs play valid audio
3. **R2 storage:** Files appear in R2 with correct metadata
4. **Billing tracking:** Records appear in `generations` table
5. **Editor integration:** Generated sounds appear in asset list
6. **Rule assignment:** Can assign generated sound to rule action
7. **Game playback:** Sound plays correctly in game runtime

---

## 8. TODOs

- [x] 1. Create ElevenLabsService utility
  - Install `elevenlabs` SDK
  - Implement `generateSFX()`, `generateVoice()`, `generateBackground()`
  - Add voice presets constant
  - Add cost estimation

- [x] 2. Create API routes
  - `POST /api/audio/generate-sfx`
  - `POST /api/audio/generate-voice`
  - `POST /api/audio/generate-background`
  - `GET /api/audio/voice-presets`
  - Add authentication middleware

- [x] 3. Test API manually
  - Verify ELEVENLABS_API_KEY in hush
  - Generate one of each type (SFX, voice, background)
  - Verify audio plays correctly

- [x] 4. Create MCP tools
  - Register `generate_sound_effect` tool
  - Register `generate_voice` tool
  - Register `generate_background_sound` tool
  - Test via chat interface

- [x] 5. Editor integration
  - Show generated sounds in asset list
  - Add type icons (🎙️ voice, 🔊 SFX, 🎵 background)
  - Preview playback in editor
  - Assign to rule actions

- [x] 6. Billing integration
  - Create `generations` table in D1
  - Implement `trackGeneration()`
  - Update user quotas
  - Add quota warnings

---

## 9. Success Criteria

- [x] ElevenLabsService generates SFX, voice, and background sounds
- [x] All three API routes work and return valid audio URLs
- [x] Manual test: Generate one of each type successfully
- [x] MCP tools registered and callable from chat
- [x] Generated sounds appear in editor asset list
- [x] Can preview sounds in editor
- [x] Can assign sounds to rule actions
- [x] Sounds play correctly in game
- [x] Generations tracked in billing system

---

## 10. Files to Create/Modify

### New Files
```
api/src/services/ElevenLabsService.ts       # Core service
api/src/routes/audio.ts                      # API route handlers
api/src/billing/generationTracker.ts         # Billing tracking
shared/src/constants/voice-presets.ts        # Voice preset library
```

### Modified Files
```
api/src/index.ts                             # Add audio routes
api/package.json                             # Add elevenlabs dependency
app/editor/components/SoundAssetList.tsx     # Show generated sounds
app/editor/panels/AudioGenerationPanel.tsx   # Generation UI (optional)
```

---

## Summary

**Unified ElevenLabs proxy** supporting SFX, voice, and background generation. Exposed via API, MCP tools, and CLI. Generated assets appear in editor, previewable, assignable to rules. Hooked into billing.

**MVP: 6 tasks. ~1-1.5 weeks.**
