# Audio Generation Plan for amen.games

> **Goal**: Iterative audio strategy for party game launch — tune voices and prompts before batch generating, one announcer voice per brand, feature-flag live generation.

---

## Guiding Principles

1. **Iterate, don't batch.** Generate a few samples of each category, tune the ElevenLabs prompts/settings, then scale up. No big-bang generation.
2. **One announcer voice per brand.** amen.games gets one voice, slopcade gets another. This voice is the "host personality" for that brand.
3. **Prompts live in code.** Every ElevenLabs generation prompt (voice, SFX, music) is defined in a checked-in config file so we can review, tweak, and re-generate.
4. **Feature-flag live generation.** Ship without live TTS. Toggle it on per-brand when ready. Static pre-gen audio works at launch; live voicing of player answers is a post-launch upgrade.

---

## 1. Where Audio Config Lives

### Brand Voice Config: `shared/src/constants/voice-presets.ts`

This file already exists and defines 5 voice presets. We extend it with **brand-level voice assignments**:

```typescript
// shared/src/constants/voice-presets.ts (existing + new)

// --- Existing preset definitions stay as-is ---

/** 
 * Brand-level voice assignments.
 * Each brand gets ONE announcer voice that is THE host for all games.
 * The voiceId here is the ElevenLabs voice to use for that brand.
 * 
 * ITERATION WORKFLOW:
 * 1. Browse ElevenLabs voice library, find candidates
 * 2. Update the voiceId here
 * 3. Run: `hush run -- npx tsx api/scripts/generate-audio.ts --brand amen --type voice --sample`
 * 4. Listen to samples, adjust, repeat
 * 5. When happy: `--generate-all` to batch produce
 */
export const BRAND_VOICES = {
  amen: {
    announcer: {
      voiceId: "TBD",           // ← You pick this from ElevenLabs
      name: "TBD",
      description: "Warm, fun, family-friendly game host for amen.games",
      model: "eleven_multilingual_v2",  // Higher quality for pre-gen
      settings: {
        stability: 0.5,
        similarityBoost: 0.75,
        style: 0.3,              // Slight personality exaggeration
      },
    },
    rules: {
      voiceId: "TBD",           // Could be same as announcer or softer voice
      name: "TBD",
      description: "Clear, warm voice for explaining game rules",
      model: "eleven_multilingual_v2",
      settings: {
        stability: 0.7,          // More consistent for instructional content
        similarityBoost: 0.75,
        style: 0.1,
      },
    },
  },
  slopcade: {
    announcer: {
      voiceId: "TBD",
      name: "TBD",
      description: "Energetic, irreverent game host for slopcade",
      model: "eleven_multilingual_v2",
      settings: {
        stability: 0.4,
        similarityBoost: 0.75,
        style: 0.5,              // More personality
      },
    },
    rules: {
      voiceId: "TBD",
      name: "TBD",
      description: "Quick, clear voice for slopcade game rules",
      model: "eleven_multilingual_v2",
      settings: {
        stability: 0.7,
        similarityBoost: 0.75,
        style: 0.2,
      },
    },
  },
} as const;
```

**Your next step**: Go to ElevenLabs, browse voices, paste the `voiceId` values here. Then we generate samples.

### SFX Prompts: `shared/src/constants/audio-sfx-prompts.ts` (new file)

Every SFX we want to generate has its ElevenLabs prompt defined here. This is where you iterate on the wording until the sound is right.

```typescript
// shared/src/constants/audio-sfx-prompts.ts

export interface SfxPromptDef {
  id: string;
  prompt: string;                // ElevenLabs SFX generation prompt
  duration: number;              // seconds
  promptInfluence?: number;      // 0-1, how literal (default 0.5)
  tags: string[];                // for categorization
}

/**
 * ITERATION WORKFLOW:
 * 1. Tweak the `prompt` text below
 * 2. Run: `hush run -- npx tsx api/scripts/generate-audio.ts --type sfx --id tick`
 * 3. Listen, adjust prompt, repeat
 * 4. When happy with all, run: `--type sfx --generate-all`
 */
export const SFX_PROMPTS: SfxPromptDef[] = [
  // --- Core UI ---
  { id: "tick",            prompt: "Short clean UI tick click sound",                          duration: 0.5, tags: ["ui"] },
  { id: "swoosh",          prompt: "Quick smooth UI swoosh transition",                        duration: 0.5, tags: ["ui"] },
  { id: "submit",          prompt: "Satisfying paper stamp submit confirmation sound",         duration: 0.5, tags: ["ui"] },
  { id: "player-join",     prompt: "Cheerful friendly player join notification pop",           duration: 0.5, tags: ["ui"] },

  // --- Game Feedback ---
  { id: "correct",         prompt: "Bright happy correct answer chime ding",                   duration: 1.0, tags: ["feedback"] },
  { id: "wrong",           prompt: "Short buzzer wrong answer sound",                          duration: 0.5, tags: ["feedback"] },
  { id: "vote-cast",       prompt: "Satisfying vote submission pop click",                     duration: 0.3, tags: ["feedback"] },
  { id: "score-up",        prompt: "Points scoring ascending chime melody",                    duration: 1.0, tags: ["feedback"] },
  { id: "score-big",       prompt: "Massive score explosion celebration fanfare",              duration: 2.0, tags: ["feedback"] },

  // --- Transitions ---
  { id: "round-start",     prompt: "Energetic round starting whoosh with impact",              duration: 1.0, tags: ["transition"] },
  { id: "round-end",       prompt: "Clean round ending resolution chord",                      duration: 1.5, tags: ["transition"] },
  { id: "reveal",          prompt: "Dramatic reveal ta-da fanfare with sparkle",               duration: 1.5, tags: ["transition"] },
  { id: "drumroll",        prompt: "Building anticipation snare drumroll",                     duration: 3.0, tags: ["transition"] },

  // --- Timer ---
  { id: "countdown-tick",  prompt: "Clock ticking countdown single tick",                      duration: 1.0, tags: ["timer"] },
  { id: "countdown-final", prompt: "Urgent final countdown warning beep",                      duration: 0.5, tags: ["timer"] },
  { id: "timer-up",        prompt: "Time's up buzzer horn blast",                              duration: 1.0, tags: ["timer"] },

  // --- Crowd Reactions ---
  { id: "crowd-laugh",     prompt: "Small group laughter crowd reaction, warm and genuine",    duration: 2.0, tags: ["crowd"] },
  { id: "crowd-gasp",      prompt: "Small group surprise gasp oh-no reaction",                 duration: 1.5, tags: ["crowd"] },
  { id: "crowd-cheer",     prompt: "Small group cheering happy celebration",                   duration: 2.0, tags: ["crowd"] },
  { id: "winner-fanfare",  prompt: "Grand victory champion fanfare with confetti celebration", duration: 3.0, tags: ["crowd"] },
];
```

### Music Prompts: `shared/src/constants/audio-music-prompts.ts` (new file)

Same pattern — every background music track has its generation prompt checked in.

```typescript
// shared/src/constants/audio-music-prompts.ts

export interface MusicPromptDef {
  id: string;
  prompt: string;
  durationMinutes: number;
  brand?: string;               // brand-specific override, or omit for shared
  tags: string[];
}

/**
 * ITERATION WORKFLOW:
 * 1. Tweak prompts below
 * 2. Run: `hush run -- npx tsx api/scripts/generate-audio.ts --type music --id lobby-chill`
 * 3. Listen, adjust, repeat
 * 4. When all sound right: `--type music --generate-all`
 */
export const MUSIC_PROMPTS: MusicPromptDef[] = [
  // --- Shared (used by both brands) ---
  { id: "lobby-chill",        prompt: "Upbeat cheerful acoustic lounge music, warm friendly gathering vibe, soft guitar and light percussion, instrumental only",           durationMinutes: 3, tags: ["lobby"] },
  { id: "lobby-hype",         prompt: "Building excitement party music, upbeat electronic with claps, getting-started energy, instrumental only",                           durationMinutes: 2, tags: ["lobby"] },
  { id: "thinking-light",     prompt: "Light playful thinking music, gentle piano with soft synth pads, quiz show background, instrumental only",                           durationMinutes: 3, tags: ["gameplay"] },
  { id: "thinking-pressure",  prompt: "Tense ticking clock quiz show music, building urgency, dramatic strings with light percussion, instrumental only",                   durationMinutes: 2, tags: ["gameplay"] },
  { id: "voting-groove",      prompt: "Fun funky voting music, light disco groove, playful bass line, game show vibe, instrumental only",                                   durationMinutes: 2, tags: ["gameplay"] },
  { id: "reveal-drama",       prompt: "Dramatic reveal music, building suspense, cinematic tension resolving to surprise, instrumental only",                               durationMinutes: 2, tags: ["reveal"] },
  { id: "scores-celebration", prompt: "Celebratory results music, triumphant brass and upbeat rhythm, game show scoreboard energy, instrumental only",                      durationMinutes: 2, tags: ["results"] },
  { id: "winner-glory",       prompt: "Grand champion victory music, epic triumphant fanfare transitioning to warm celebration, instrumental only",                         durationMinutes: 1, tags: ["results"] },

  // --- Amen brand overrides ---
  { id: "lobby-chill",        prompt: "Warm acoustic worship gathering music, gentle guitar and piano, church fellowship vibe, welcoming and joyful, instrumental only",    durationMinutes: 3, brand: "amen", tags: ["lobby"] },
  { id: "thinking-light",     prompt: "Soft contemplative background, gentle pads and acoustic guitar, peaceful reflection, instrumental only",                             durationMinutes: 3, brand: "amen", tags: ["gameplay"] },
  { id: "winner-glory",       prompt: "Joyful celebration worship music, uplifting and triumphant, hallelujah energy, instrumental only",                                   durationMinutes: 1, brand: "amen", tags: ["results"] },
];
```

### Phase Transition Lines: `shared/src/constants/audio-announcer-lines.ts` (new file)

Pre-canned announcer lines, organized by phase. These get pre-generated per brand (using that brand's announcer voice).

```typescript
// shared/src/constants/audio-announcer-lines.ts

export interface AnnouncerLineDef {
  id: string;
  phase: string;
  text: string;
  /** Optional brand-specific override text */
  brandOverrides?: Record<string, string>;
}

export const ANNOUNCER_LINES: AnnouncerLineDef[] = [
  // --- Lobby ---
  { id: "lobby-welcome",     phase: "lobby",    text: "Welcome, everyone! Let's get this started!" },
  { id: "lobby-waiting",     phase: "lobby",    text: "Waiting for more players to join..." },
  { id: "lobby-ready",       phase: "lobby",    text: "Looking good! Ready when you are." },

  // --- Rounds ---
  { id: "round-1",           phase: "round",    text: "Round one!" },
  { id: "round-2",           phase: "round",    text: "Round two!" },
  { id: "round-3",           phase: "round",    text: "Round three!" },
  { id: "round-final",       phase: "round",    text: "Final round!" },
  { id: "here-we-go",        phase: "round",    text: "Here we go!" },

  // --- Answering ---
  { id: "time-to-write",     phase: "answering", text: "Time to write your answers!" },
  { id: "get-creative",      phase: "answering", text: "Get creative!" },

  // --- Voting ---
  { id: "time-to-vote",      phase: "voting",   text: "Time to vote!" },
  { id: "pick-favorite",     phase: "voting",   text: "Which one's your favorite?" },
  { id: "choose-wisely",     phase: "voting",   text: "Choose wisely!" },

  // --- Reveal ---
  { id: "and-the-answers",   phase: "reveal",   text: "And the answers are..." },
  { id: "lets-see",          phase: "reveal",   text: "Let's see what you came up with!" },
  { id: "drumroll-please",   phase: "reveal",   text: "Drumroll please..." },
  { id: "the-truth-was",     phase: "reveal",   text: "The truth was..." },

  // --- Scores ---
  { id: "check-scores",      phase: "scores",   text: "Let's check the scores!" },
  { id: "standings",         phase: "scores",   text: "Here's where things stand." },

  // --- Winner ---
  { id: "and-the-winner",    phase: "winner",   text: "And the winner is..." },
  { id: "congrats",          phase: "winner",   text: "Congratulations!" },
  { id: "what-a-game",       phase: "winner",   text: "What a game!" },

  // --- Timer ---
  { id: "ten-seconds",       phase: "timer",    text: "Ten seconds left!" },
  { id: "five-seconds",      phase: "timer",    text: "Five seconds!" },
  { id: "times-up",          phase: "timer",    text: "Time's up!" },
];
```

### Per-Game Audio Config: In Each Game's `manifest.json`

Each game already has a `manifest.json`. We add an `audio` section describing which shared audio it uses and any game-specific overrides:

```jsonc
// r2/games/party/quiplash/manifest.json (adding audio section)
{
  "name": "quiplash",
  // ... existing fields ...
  "audio": {
    "music": {
      "lobby": "lobby-chill",
      "answering": "thinking-light",
      "voting": "voting-groove",
      "reveal": "reveal-drama",
      "scores": "scores-celebration",
      "winner": "winner-glory"
    },
    "announcer": {
      "phases": ["lobby", "round", "answering", "voting", "reveal", "scores", "winner"],
      "voiceContentPack": true
    },
    "sfx": {
      "onSubmit": "submit",
      "onVote": "vote-cast",
      "onReveal": "reveal",
      "onScoreUp": "score-up",
      "onWinner": "winner-fanfare"
    },
    "liveVoice": {
      "enabled": false,
      "phases": ["reveal", "round_results"],
      "voiceField": "playerAnswers"
    }
  }
}
```

The `liveVoice.enabled: false` is the per-game feature flag. Flip it to `true` when ready.

---

## 2. Feature Flags for Live Generation

### Client-Side (existing system)

The app already has `app/lib/utils/featureFlags.ts` with `FeatureFlags` interface. Add:

```typescript
export interface FeatureFlags {
  useRemixDefault: boolean;
  experimentalAiFeatures: boolean;
  enableLiveVoiceGeneration: boolean;  // NEW — gates live TTS in party games
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  useRemixDefault: false,
  experimentalAiFeatures: false,
  enableLiveVoiceGeneration: false,    // OFF by default at launch
};
```

### Server-Side (per-game manifest)

The `audio.liveVoice.enabled` field in each game's manifest acts as a server-side gate. Even if the client flag is on, the game script checks the manifest before calling `prepareVoice`.

### Rollout plan

| Phase | Client Flag | Game Manifest | Result |
|---|---|---|---|
| **Launch** | `false` | `enabled: false` | No live voice. Pre-gen audio only. |
| **Internal testing** | `true` (dev only) | `enabled: true` on 1-2 games | Test live voice on Quiplash + Truth Trap |
| **Gradual rollout** | `true` | `enabled: true` per game | Enable per-game as we confirm quality |
| **Full rollout** | `true` (default) | `enabled: true` on all | Live voice everywhere |

---

## 3. Content Inventory (What We Have)

### Amen Content Packs (~348 voiceable strings)

| Pack File | Items | Voiceable Strings | Content Type | Used By |
|---|---|---|---|---|
| `amen-quip.json` | 20 | 20 prompts | quip | Quiplash, Crowd Comedy, Open Mic Frenzy, Half & Half, About You Bluff, Chain Reaction, Role Replay, Ruin & Redeem |
| `amen-trivia.json` | 20 | 20 questions | trivia | Quickfire Q&A |
| `amen-fibbage.json` | 18 | 18 questions | fibbage | Truth Trap |
| `amen-history.json` | 15 | 15 questions | estimation | Year Jinx |
| `amen-wager.json` | 24 | 24 questions + 24 fun facts | wager | Percent Panic |
| `amen-dilemma.json` | 18 | 36 options (A+B) | wyr | Consensus Mine |
| `amen-drawing.json` | 18 | 18 prompts | drawing | Drawful Animate, Sketch Bluff |
| `amen-ranking.json` | 18 | 18 topics | ranking | Consensus Mine |
| `amen-headsup.json` | 15 decks | ~150 words (deck names only voiced) | headsup | Heads Up |
| `amen-easter-special.json` | 62 | 59 mixed | seasonal | All types (Easter) |
| `amen-good-friday.json` | 23 | 31 mixed | seasonal | All types (Good Friday) |

### Slopcade Fallback Content

| Pack File | Items | Content Type |
|---|---|---|
| `quiplash-prompts.json` | 84 | quip |
| `trivia-prompts.json` | 5 | trivia |

### 27 Party Games (all need audio)

| Game | Type | Content Pack | Voice-Heavy? |
|---|---|---|---|
| Quiplash | Comedy/Blanks | quip | **Yes** — reads prompts + player answers |
| Truth Trap | Bluffing | fibbage | **Yes** — reads questions + player lies |
| Crowd Comedy | Comedy | quip | **Yes** — reads prompts + player answers |
| Open Mic Frenzy | Comedy | quip | **Yes** — reads prompts + punchlines |
| About You Bluff | Storytelling | quip | **Yes** — reads prompts + stories |
| Quickfire Q&A | Trivia | trivia | **Yes** — reads questions |
| Year Jinx | Estimation | history | **Yes** — reads questions |
| Percent Panic | Wagering | wager | **Yes** — reads questions + fun facts |
| Consensus Mine | Ranking | ranking | Moderate — reads topics |
| Half and Half | Dilemma | quip | Moderate — reads options |
| Chain Reaction | Word Association | quip | Moderate |
| Role Replay | Improv | quip | Moderate |
| Ruin and Redeem | Creative Writing | quip | Moderate |
| Punchline Duel | Comedy | quip | Moderate |
| Lexicon Ladder | Word Game | FakeWord | Moderate |
| Heads Up | Guessing | headsup | Light — category only |
| Drawful Animate | Drawing | drawing | Light — prompt only |
| Sketch Bluff | Drawing | drawing | Light — prompt only |
| Shirt Clash | Drawing | — | Light — SFX/music only |
| Rival Roster | Drawing | — | Light — SFX/music only |
| Chroma Clues | Color Guessing | — | Light — SFX/music only |
| Out of Context | Captioning | caption | Light |
| Punchline Ferry | Collab Comedy | joke-template | Light |
| Quick Poll | Polling | — | Light |
| Question Answer | Simple Q&A | — | Light |
| partyQuestionAnswer | Simple Q&A | — | Light |
| Spectrum Guess | Nonsensory | NonsensoryScale | Light |

---

## 4. Iterative Generation Workflow

### Step 1: Pick Your Voices (YOU DO THIS NOW)

1. Go to [ElevenLabs Voice Library](https://elevenlabs.io/voice-library)
2. Find an amen announcer voice — warm, fun, family-friendly host energy
3. Find a slopcade announcer voice — more energetic, irreverent, gamer energy
4. Optionally: find a "rules" voice — calmer, clearer (could be same voice, different settings)
5. Paste the `voiceId` values into `BRAND_VOICES` in `voice-presets.ts`

### Step 2: Generate Voice Samples (Test 3-5 Lines)

Pick a few representative lines and generate them to hear how the voice sounds:

```bash
# Sample: one quip prompt
hush run -- npx tsx api/scripts/generate-audio.ts \
  --brand amen --type voice --sample \
  --text "The church announcement nobody expected this Sunday"

# Sample: one trivia question
hush run -- npx tsx api/scripts/generate-audio.ts \
  --brand amen --type voice --sample \
  --text "What was the name of the garden where Adam and Eve lived?"

# Sample: one announcer line
hush run -- npx tsx api/scripts/generate-audio.ts \
  --brand amen --type voice --sample \
  --text "And the winner is... Congratulations!"
```

Listen. Tweak `stability`, `similarityBoost`, `style` in `BRAND_VOICES`. Re-generate. Repeat.

### Step 3: Generate a Few SFX (Test 3-5 Sounds)

```bash
# Test a few SFX prompts
hush run -- npx tsx api/scripts/generate-audio.ts --type sfx --id tick
hush run -- npx tsx api/scripts/generate-audio.ts --type sfx --id correct
hush run -- npx tsx api/scripts/generate-audio.ts --type sfx --id reveal
hush run -- npx tsx api/scripts/generate-audio.ts --type sfx --id drumroll
hush run -- npx tsx api/scripts/generate-audio.ts --type sfx --id winner-fanfare
```

Listen. Tweak prompts in `audio-sfx-prompts.ts`. Re-generate.

### Step 4: Generate a Few Music Tracks (Test 2-3 Tracks)

```bash
# Test lobby and thinking music
hush run -- npx tsx api/scripts/generate-audio.ts --type music --id lobby-chill
hush run -- npx tsx api/scripts/generate-audio.ts --type music --id thinking-light
hush run -- npx tsx api/scripts/generate-audio.ts --type music --id winner-glory
```

Music is the hardest to get right. Expect several iterations.

### Step 5: Batch Generate (Once Happy)

```bash
# Generate all SFX
hush run -- npx tsx api/scripts/generate-audio.ts --type sfx --generate-all

# Generate all music (shared + amen overrides)
hush run -- npx tsx api/scripts/generate-audio.ts --type music --generate-all --brand amen

# Generate all announcer lines for amen
hush run -- npx tsx api/scripts/generate-audio.ts --type announcer-lines --generate-all --brand amen

# Generate all content pack voice-overs for amen
hush run -- npx tsx api/scripts/generate-audio.ts --type content-voice --generate-all --brand amen

# Generate game rules voice-overs
hush run -- npx tsx api/scripts/generate-audio.ts --type rules --generate-all --brand amen
```

### Step 6: Wire Into Games

After generating, run a script that updates each game's `manifest.json` with the correct `audio` section pointing to the generated R2 URLs.

---

## 5. Audio Storage Layout

```
r2/
  audio/
    voice/
      amen/
        content/                    # Pre-gen content pack voiceovers
          quip/
            amen-quip-001.mp3
            amen-quip-002.mp3
          trivia/
            amen-triv-001.mp3
          fibbage/
            amen-fib-001.mp3
          ...
        rules/                      # Pre-gen game rules
          quiplash.mp3
          truth-trap.mp3
          ...
        transitions/                # Pre-gen announcer lines
          lobby-welcome.mp3
          round-1.mp3
          time-to-vote.mp3
          ...
      slopcade/
        content/                    # Same structure for slopcade brand
        rules/
        transitions/
    sfx/
      shared/                       # SFX are brand-agnostic
        tick.mp3
        correct.mp3
        drumroll.mp3
        ...
    music/
      shared/                       # Default music tracks
        lobby-chill.mp3
        thinking-light.mp3
        ...
      amen/                         # Brand-specific overrides
        lobby-chill.mp3             # Overrides shared version
        thinking-light.mp3
        winner-glory.mp3
```

---

## 6. Cost Summary

| Category | Items | One-Time Cost | Per-Session Cost |
|---|---|---|---|
| Pre-gen: Content pack voicing | ~348 clips | ~$2.50 | $0 |
| Pre-gen: Game rules | ~27 clips | ~$0.65 | $0 |
| Pre-gen: Phase transitions | ~50 clips | ~$0.24 | $0 |
| Pre-gen: SFX library | ~20 clips | Included in plan | $0 |
| Pre-gen: Background music | ~11 tracks (~17 min) | ~$4.76 | $0 |
| Live-gen: Player answers (post-launch) | ~24/session | $0 | ~$0.10 |
| **TOTAL** | | **~$8.15 one-time** | **~$0.10/session (when enabled)** |

Note: Iteration samples before batch gen will add ~$2-5 in experimentation costs.

---

## 7. Launch Priorities

### P0 — Must Have for Launch (pre-gen only, no live voice)
1. **Pick announcer voices** — you do this in ElevenLabs now
2. **Core SFX library** (20 clips) — iterate on prompts, then batch
3. **Background music** (8 shared + 3 amen overrides) — iterate, then batch
4. **Pre-gen content pack questions** (~348 clips) — after voice is locked
5. **Wire audio into game manifests** — `audio` section in each `manifest.json`

### P1 — Post-Launch (feature-flagged)
6. **Pre-gen game rules** (27 clips)
7. **Pre-gen announcer transition lines** (~50 clips)
8. **Live voice generation** — enable on Quiplash first as pilot

### P2 — Polish
9. Crowd reaction SFX
10. Player name voicing (live-gen: "And the winner is Sarah!")
11. Additional music variety per mood

### P3 — Future
12. Custom voice cloning for truly unique brand identity
13. Slopcade brand audio (separate announcer + content voiceovers)
14. Localization / multilingual

---

## 8. Implementation Tasks

These are the concrete things to build:

### Task 1: Create Audio Config Files
- [ ] Extend `voice-presets.ts` with `BRAND_VOICES`
- [ ] Create `shared/src/constants/audio-sfx-prompts.ts`
- [ ] Create `shared/src/constants/audio-music-prompts.ts`
- [ ] Create `shared/src/constants/audio-announcer-lines.ts`

### Task 2: Build Generation Script
- [ ] Create `api/scripts/generate-audio.ts` (or tRPC route)
- [ ] Supports `--type voice|sfx|music|announcer-lines|rules|content-voice`
- [ ] Supports `--brand amen|slopcade`
- [ ] Supports `--id <specific-id>` for single generation (iteration)
- [ ] Supports `--sample` for quick test with a few items
- [ ] Supports `--generate-all` for batch
- [ ] Outputs to `r2/audio/` with correct directory structure
- [ ] Generates an audio manifest JSON mapping IDs to URLs

### Task 3: Add Feature Flag
- [ ] Add `enableLiveVoiceGeneration` to `FeatureFlags` interface
- [ ] Add `audio.liveVoice.enabled` to game manifest schema
- [ ] Gate `prepareVoice` calls behind both flags in server scripts

### Task 4: Wire Audio into Party Game Runtime
- [ ] Add `audio` section schema to manifest parser
- [ ] Auto-populate `sounds` in GameDefinition from `audio` config
- [ ] Add phase-change audio triggers to party game base script
- [ ] Background music switches based on `audio.music[phase]`

---

## 9. Open Decisions (For You)

1. **Voice selection** — Browse ElevenLabs, pick amen + slopcade announcer voices. This unblocks everything.

2. **Dilemma phrasing** — Generate "Would you rather [A]... or [B]?" as one clip? Or two separate clips? One clip flows better.

3. **Seasonal content** — Pre-gen Easter/Good Friday packs now or wait? (62 + 23 items, ~$0.50)

4. **Music source** — ElevenLabs Music API ($0.28/min) vs. royalty-free library? ElevenLabs gives us iteration control but limited style range. Royalty-free is cheaper but harder to match exactly.

5. **Rules voice** — Same voice as announcer with calmer settings, or totally different voice? (I'd suggest same voice, calmer settings — maintains brand consistency.)
