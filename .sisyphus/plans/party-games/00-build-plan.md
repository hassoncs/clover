# Party Games Build Plan — Infrastructure First

> **Philosophy**: Build the base layer that powers ANY party game idea first, then stamp out specific games rapidly on top of it.

---

## Layer 0: What Already Exists (Audit Results)

### Server Infrastructure (PartyRoomDO) — `api/src/party/PartyRoomDO.ts`
| Capability | Status | Code Location |
|------------|--------|---------------|
| Room lifecycle (create, join, leave, cleanup) | ✅ DONE | `PartyRoomDO.fetch()`, `handleInit()` |
| WebSocket real-time sync | ✅ DONE | `broadcastToAll()`, `broadcastToPlayers()`, `broadcastToHost()` |
| Phase state machine (lobby → playing → ended) | ✅ DONE | `setPhase()` |
| Input request/response (text, choice, drawing, buzzer) | ✅ DONE | `requestInput()` — Promise-based with timeout |
| Shared game state broadcast | ✅ DONE | `updateSharedData()` — merges partial data, broadcasts |
| Player scoring | ✅ DONE | `updatePlayerScore()` — delta-based |
| Rate limiting | ✅ DONE | 10 msg/sec per player |
| Reconnection (60s grace) | ✅ DONE | `handleDisconnect()` with timer |
| Host/player role separation | ✅ DONE | WebSocket metadata tracks role |
| Template runner injection | ✅ DONE | `setTemplateRunner()` + registry lookup via `handleInit()` |
| Room code support | ✅ DONE | Set via `/init`, exposed via `getRoomCode()` |
| Auto-cleanup alarm | ✅ DONE | 4-hour expiry via `alarm()` |

### Client Infrastructure — `app/lib/party/` + `app/components/party/`
| Component | Status | File |
|-----------|--------|------|
| WebSocket connection hook | ✅ DONE | `usePartyConnection.ts` — connects, reconnects, routes messages |
| React context provider | ✅ DONE | `PartyContext.tsx` — wraps `usePartyConnection`, exposes `useParty()` |
| Private state plumbing | ⚠️ STUBBED | `privateState` field exists in context but server never sends it |
| Text answer input | ✅ DONE | `AnswerInput.tsx` |
| Vote/choice list | ✅ DONE | `VoteList.tsx` |
| Prompt card display | ✅ DONE | `PromptCard.tsx` |
| Timer display | ✅ DONE | `Timer.tsx` |
| Scoreboard | ✅ DONE | `Scoreboard.tsx` |
| Game screen (phase router) | ✅ DONE | `play.tsx` — switches on `sharedData.phase` |
| Host lobby screen | ✅ DONE | `host.tsx` |
| Join screen | ✅ DONE | `join.tsx` |
| Drawing canvas | ⚠️ EXAMPLE ONLY | `app/examples/paint.tsx` — works but not wired as party input |
| Buzzer input | ❌ MISSING | Type defined, no UI component |

### Content Pipeline — `packages/content-pipeline/`
| Content Type | Schema | Gen Prompts | Moderation | Content on Disk |
|-------------|--------|-------------|------------|-----------------|
| QuipPrompt | ✅ | ✅ | ✅ | 64 items |
| TriviaQuestion | ✅ | ✅ | ✅ | 0 items |
| DrawingPrompt | ✅ | ✅ | ✅ | 0 items |
| WouldYouRather | ✅ | ✅ | ✅ | 0 items |
| EstimationQuestion | ✅ | ✅ | ✅ | 0 items |
| FibbageQuestion | ✅ | ❌ | ✅ | 0 items |
| CaptionPrompt | ✅ | ❌ | ✅ | 0 items |
| WordGamePrompt | ✅ | ❌ | ✅ | 0 items |

### Template Utilities — DUPLICATED across templates
These functions are copy-pasted in both `quiplash.ts` and `crowd-comedy.ts`:
- `shuffle<T>(arr: T[]): T[]`
- `delay(ms: number): Promise<void>`
- `startCountdown(room, seconds): interval`
- `buildScoreboard(scores, names): ScoreEntry[]`
- `generateId(): string`

### Audio/Media
| Capability | Status | Location |
|------------|--------|----------|
| TTS (ElevenLabs) | ✅ DONE | `api/src/services/ElevenLabsService.ts` |
| SFX generation | ✅ DONE | `api/src/services/ElevenLabsService.ts` |
| Mic capture (web) | ✅ DONE | `app/lib/speech/audioCapture.web.ts` |
| Mic capture (native) | ✅ DONE | `app/lib/speech/audioCapture.native.ts` |
| Speech-to-text WebSocket | ✅ DONE | `api/src/index.ts` — `/ws/speech-to-text` |
| Image generation | ✅ DONE | Scenario.com pipeline |

---

## Layer 1: Shared Template Utilities (Extract & Formalize)

**Goal**: Extract duplicated code into a reusable toolkit so every new game template starts with batteries included.

**Priority**: DO THIS FIRST. Every game we build will use these.

### Task 1.1: `api/src/party/templates/utils.ts`
Extract from quiplash.ts and crowd-comedy.ts:
```
shuffle<T>(arr: T[]): T[]
delay(ms: number): Promise<void>
generateId(): string
startCountdown(room: PartyRoomDO, seconds: number): interval
buildScoreboard(scores: Map<string, number>, names: Map<string, string>): ScoreEntry[]
```

**New additions to add**:
```
// Player management helpers
getActivePlayers(room): PartyPlayer[]  // connected, non-host
getPlayerName(room, playerId): string
initializeScores(playerIds: string[]): Map<string, number>
initializePlayerNames(responses: Map<string, PartyInputResponse>): Map<string, string>

// Round management
runRoundLoop(room, rounds: number, roundFn: (round, multiplier) => Promise<void>): Promise<void>

// Scoring helpers
awardProportionalPoints(votes: Map<string, number>, basePoints: number, multiplier: number): Map<string, number>
detectSweep(votesForPlayer: number, totalVotes: number): boolean
```

**Effort**: S (2-4h) | **Unlocks**: Every future template is cleaner

### Task 1.2: Generic Content Loader
Replace the hardcoded `quiplash-prompts.json` import pattern with a generic loader.

`api/src/party/content/loader.ts`:
```
loadContentPack<T>(gameType: string): T[]
selectForRound<T extends {id: string}>(pool: T[], count: number, used: Set<string>): T[]
```

Games would load content by type: `loadContentPack<TriviaQuestion>('trivia')` instead of directly importing JSON files.

**Effort**: S (2-4h) | **Unlocks**: Any game can load any content type

---

## Layer 2: PartyRoomDO Enhancements (Generic Party Platform)

These are capabilities that MANY games need. Build them into the DO itself, not into individual templates.

### Task 2.1: `sendToPlayer(playerId, message)` — Per-Player Messaging
**What**: Add a method to send a WebSocket message to a specific player (not broadcast).
**Why**: Required by hidden roles (Faker doesn't see prompt), private messaging (Monster Seeking Monster), asymmetric prompts (Push the Button), and per-player content (Fibbage shows different info to different players).
**How**: Iterate `sockets`, match `socketMetadata.playerId`, send only to that socket.
**Also**: Activate the `privateState` plumbing already stubbed in `usePartyConnection.ts` — the client already has `setPrivateState` but the server never triggers it.
**Unlocks**: ~15 games (all social deduction, bluffing with asymmetric info, private messaging)
**Effort**: S (2-4h)

### Task 2.2: `requestInputFromSubset(playerIds[], requestId, request)` — Targeted Input
**What**: Like `requestInput()` but only sends to specific players and only waits for their responses.
**Why**: Many games need different players to do different things simultaneously (e.g., one player draws while others wait, judge picks while players compose, presenter talks while assistant picks slides).
**How**: Filter broadcast to subset, track expected responders separately.
**Unlocks**: ~20 games (judge-based, presenter/assistant, team-specific actions)
**Effort**: M (8-16h)

### Task 2.3: Team System
**What**: First-class team support in PartyRoomDO.
**Changes**:
- Add `team?: string` to `PartyPlayer` (already has `role?: string` which could work, but teams are semantically different)
- `assignTeams(teamCount: number, mode: 'random' | 'balanced' | 'manual')`
- `getTeamPlayers(team: string): PartyPlayer[]`
- `updateTeamScore(team: string, delta: number)`
- `broadcastToTeam(team: string, message)`
**Unlocks**: ~8 games (Poll Mine, Bomb Corp, FixyText, all team-based games)
**Effort**: M (8-16h)

### Task 2.4: Spectator/Audience Role
**What**: Allow connections with `role: 'audience'` that receive state updates but don't count as players and can't send input unless explicitly requested.
**Why**: Large-audience games (Lie Swatter, streaming), plus audience voting in Quiplash-style games.
**How**: Add `audience` to the role check in `handleWebSocketUpgrade`. Audience sockets get broadcasts but are filtered from `requestInput` responder counts.
**Unlocks**: ~10 games (any game with audience voting, mass-participation modes)
**Effort**: M (8-16h)

---

## Layer 3: Content Pipeline Completion

### Task 3.1: Wire Missing Generation Prompts
Add configs to `packages/content-pipeline/src/generate/prompts.ts` for:
- `fibbage` — Generate obscure facts with one key detail blanked out + the real answer
- `caption` — Generate absurd image descriptions or weird object descriptions for storytelling games
- `wordgame` — Generate target words with constrained clue banks, rhyme sets, association chains

**Effort**: M (8-16h) | **Unlocks**: Fibbage, Blather Round, word-based games

### Task 3.2: Bulk Content Generation Run
Generate and moderate large content libraries:
- 500+ quip prompts (currently 64 — way too few for replayability)
- 500+ trivia questions (via OpenTDB + AI)
- 200+ drawing prompts
- 200+ estimation questions
- 200+ would-you-rather scenarios
- 200+ fibbage facts (once 3.1 is done)
- 100+ word game prompts (once 3.1 is done)

**Effort**: M (8-16h of generation + review) | **Unlocks**: Every content-driven game has enough variety

### Task 3.3: New Content Types for Party-Specific Needs
Add schemas + generation for types not yet defined:
- `ScenarioPrompt` — Wholesome scenarios to ruin (for Doominate-style games)
- `SplitOpinionPrompt` — Fill-in-the-blank targeting 50/50 splits
- `RoleCard` — Character traits/personalities for role-playing games
- `SurveyQuestion` — Personal opinion/preference questions for estimation/deduction
- `SoundPrompt` — Descriptions of sounds to record or compose

**Effort**: L (24-40h) | **Unlocks**: Waves 2-4 game variety

---

## Layer 4: Client-Side Generic Components

### Task 4.1: Drawing Input Component
**What**: Extract `paint.tsx` example into a reusable `DrawingInput.tsx` party component.
**Interface**: `<DrawingInput onSubmit={(imageData) => sendInput(imageData)} timeLimit={30} colors={3} />`
**Features**: Limited color palette, undo button, clear button, submit button, timer integration.
**Effort**: M (8-16h) | **Unlocks**: ~10 drawing games

### Task 4.2: Buzzer Input Component
**What**: Simple big button that sends input immediately on tap.
**Interface**: `<BuzzerInput onBuzz={() => sendInput(Date.now())} label="BUZZ!" />`
**Features**: Haptic feedback, visual press state, optional speed indicator.
**Effort**: S (2-4h) | **Unlocks**: Ready check, speed rounds, buzzer games

### Task 4.3: Phase Router Generalization
**What**: Currently `play.tsx` hardcodes phase→component mapping for Crowd Comedy. Make it generic.
**How**: Each game template registers its own phase→component map. The play screen looks up the current game's template and renders accordingly.
**Pattern**:
```tsx
const GAME_RENDERERS: Record<string, Record<string, ComponentType>> = {
  quiplash: { answering: QuiplashAnswering, voting: QuiplashVoting, ... },
  fibbage: { writing_lies: FibbageWriting, voting: FibbageVoting, ... },
};
```
**Effort**: M (8-16h) | **Unlocks**: Every new game can have its own client UI

### Task 4.4: Host Display Screen Generalization
**What**: The host screen should show the "TV view" — prompts, answers, vote results, animations. Currently minimal.
**How**: Mirror the phase router pattern for the host view. Each game provides host-side renderers.
**Effort**: L (24-40h) | **Unlocks**: Proper "cast to TV" party game experience

---

## Layer 5: Game Template Framework

### Task 5.1: Template Base Class / Helper
**What**: A higher-level abstraction on top of PartyRoomDO that handles the common game loop:
```
1. Ready check (buzzer)
2. For each round:
   a. Show prompt/setup
   b. Collect input (text/choice/drawing)
   c. Optional: voting phase
   d. Reveal results
   e. Update scores
3. Show final scores + winner
```
**How**: Not a class — a composable set of functions:
```ts
const players = await readyCheck(room, { minPlayers: 3 });
const scores = initializeScores(players);

for (const round of rounds(3)) {
  const prompt = pickPrompt(pool, used);
  const answers = await collectAnswers(room, prompt, { timeLimit: 30 });
  const votes = await collectVotes(room, answers, { timeLimit: 15 });
  applyVoteScoring(scores, votes, { multiplier: round.number, sweepBonus: 1.25 });
  await showReveal(room, { answers, votes, scores });
  await showScoreboard(room, scores);
}

await showWinner(room, scores);
```
**Effort**: L (24-40h) | **Unlocks**: New games become 50-100 lines instead of 300+

---

## Revised Priority Order

### Phase 1: Foundation (Week 1) — Do this NOW
| # | Task | Effort | What It Unlocks |
|---|------|--------|-----------------|
| 1 | **1.1** Extract shared template utilities | S | Every future template |
| 2 | **1.2** Generic content loader | S | Any game, any content type |
| 3 | **2.1** `sendToPlayer()` + activate privateState | S | 15+ games needing per-player data |
| 4 | **4.2** Buzzer input component | S | Ready checks, speed games |
| 5 | **3.2** Bulk content generation (quips + trivia first) | M | Replayability |

**Outcome**: Shared utilities extracted, per-player messaging works, 500+ content items generated.

### Phase 2: Core Platform (Week 2-3)
| # | Task | Effort | What It Unlocks |
|---|------|--------|-----------------|
| 6 | **2.2** `requestInputFromSubset()` | M | Judge games, presenter games, asymmetric games |
| 7 | **4.1** Drawing input component | M | 10+ drawing games |
| 8 | **4.3** Phase router generalization | M | Every game gets its own UI |
| 9 | **3.1** Wire fibbage/caption/wordgame generation | M | 8+ content-driven games |
| 10 | **5.1** Template helper framework | L | Game templates become trivial to write |

**Outcome**: Platform supports text, choice, drawing, buzzer inputs with per-player routing and subset targeting. New templates are fast to write.

### Phase 3: Extended Platform (Week 4)
| # | Task | Effort | What It Unlocks |
|---|------|--------|-----------------|
| 11 | **2.3** Team system | M | 8 team-based games |
| 12 | **2.4** Spectator/audience role | M | 10+ games with audience participation |
| 13 | **4.4** Host display generalization | L | Proper party experience on TV |
| 14 | **3.3** New content type schemas | L | Waves 2-4 variety |

**Outcome**: Full party game platform — teams, audiences, host TV view, rich content library.

### Phase 4: Stamp Out Games (Month 2+)
With the platform complete, each new game is just:
1. A template file (50-200 lines using the framework)
2. A content pack (generated via pipeline)
3. A client phase renderer (React components for each phase)

Games can be built in priority order from the individual game docs (`01-*.md` through `05-*.md`).

---

## What We Do NOT Need to Build (Avoided Duplication)

| Concern | Resolution |
|---------|------------|
| Scoring system | ✅ Already exists — `updatePlayerScore()` + `buildScoreboard()` |
| Timer system | ✅ Already exists — `startCountdown()` synced to clients |
| WebSocket reconnection | ✅ Already exists — 60s grace period with timer |
| Rate limiting | ✅ Already exists — 10 msg/sec per player |
| Content moderation | ✅ Already exists — keyword blocklist in content pipeline |
| TTS for game narration | ✅ Already exists — ElevenLabs integration |
| Mic recording | ✅ Already exists — Web + Native audio capture |
| Image generation for assets | ✅ Already exists — Scenario.com pipeline |
| Room codes | ✅ Already exists — set via `/init` |
| Host/player role distinction | ✅ Already exists — separate WebSocket handling |

---

## Summary

**The platform is 60-70% built.** The foundational networking, state sync, and content pipeline are solid. What's missing is the **generic layer** between the raw DO capabilities and individual game templates.

Build order:
1. **Shared utilities** (extract duplication) — 1 day
2. **Per-player messaging** (activate the stub) — 1 day  
3. **Content generation** (bulk run) — 1 day
4. **Input components** (drawing, buzzer) — 2-3 days
5. **Template framework** (composable game loop) — 3-5 days
6. **Teams + audience** — 3-5 days
7. **Phase router + host display** — 3-5 days

After ~3 weeks of platform work, you can stamp out games at a rate of 1-2 per day.
