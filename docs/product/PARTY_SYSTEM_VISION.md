# Party System Vision

> **Status**: Living document
> **Last updated**: Feb 17, 2026
> **MVP target**: amen.games Easter launch (Apr 5, 2026)

---

## The Big Idea

Slopcade is a platform where anyone can build any app, and any screen can use either Godot or Skia depending on what it needs. The engine takes care of rendering, connecting players, generating graphics, and generating sound. You describe what you want, and the platform figures out which rendering stack to use.

The party system is the first product built on this platform: Jackbox-style multiplayer games where a host casts to a TV and players join on their phones with a 4-digit code. The architecture below supports this use case today and extends to user-built party games in the future.

---

## Rendering Philosophy: Right Tool Per Screen

Not every screen needs the same rendering stack. A phone showing a text input doesn't need a game engine. A TV showing animated reveals with sound effects does.

### The Two Rendering Stacks

| Stack | What it's good at | Cost | When to use |
|-------|-------------------|------|-------------|
| **Skia + React Native** | UI controls, text, forms, lists, 2D drawing, simple animations | Light — no WASM, instant load | Player controllers, input screens, scoreboards, lobbies |
| **Godot** | Physics, sprites, shaders, particle effects, sound, complex animation | Heavy — WASM download, engine init | Host display, spectacle screens, anything with physics or rich visuals |

### The Rule

**Each screen in the system independently decides which stack to use.** A game definition declares per-role, per-phase rendering requirements. The engine loads Godot only when needed.

```
Player phone:  Skia/React Native (always — phones are controllers)
Host display:  Godot (for spectacle) OR Skia (for simple phases like lobby)
Audience view: Skia (lightweight read-only spectating)
```

Godot is never loaded on player phones for party games. It's too heavy for what's essentially a remote control. The host display is where the fun visual stuff lives — animations, sounds, shaders, physics-driven reveals — and that's where Godot earns its weight.

### Lazy Loading

Godot is loaded asynchronously and only when a phase requires it. The existing `WithGodot` component and lazy `import("@/lib/game-engine/GameRuntime.godot")` pattern in `app/app/play/[id].tsx` already demonstrates this. Party games will follow the same pattern: lobby phase renders with React Native, then when the game starts and the host needs spectacle, Godot loads in the background.

---

## Architecture: Current vs Target

### Current State (Feb 2026)

Two completely separate stacks with no rendering overlap:

```
Party System                          Game Engine
-----------                          -----------
React Native Views                    Godot 4 (WASM/Native)
WebSocket -> Durable Object           EntityManager + Scene Tree
QuickJS sandbox (room.* API)          QuickJS sandbox (ctx.* API)
Phase components (React)              Script-first ECS
/party/* routes                       /play/[id] routes
```

What they share: auth, theming, shared types package, API backend, QuickJS WASM runtime (different APIs).

### Target State

The party system's host display uses the game engine for visual phases, while player phones stay on React Native. The scripting API surfaces are aligned so game builders can use similar patterns regardless of rendering stack.

```
                    Party Game Session
                    ==================

   Host (TV/Laptop)              Players (Phones)
   ================              ================
   Godot for spectacle           React Native + Skia
   - Animated reveals            - Text input
   - Sound effects               - Multiple choice
   - Shader transitions          - Buzzer
   - Physics-driven visuals      - Drawing (Skia canvas)
   - Score celebrations          - Voting
   |                             - Wheel spin
   | Falls back to React         |
   | Native for simple phases    | Always lightweight
   | (lobby, waiting screens)    | No Godot, ever
   |                             |
   +----------+------------------+
              |
     Cloudflare Durable Object
     ==========================
     QuickJS sandbox runs game logic
     Server-authoritative state
     WebSocket to all clients
```

### Key Principle: Server-Authoritative, Client-Presentational

Game logic runs in the Durable Object's QuickJS sandbox. Clients (host and players) are purely presentational. The server tells clients what phase they're in, what data to display, and what input to collect. Clients never run game logic.

This means:
- The host Godot instance receives state updates and renders them visually (no game logic in Godot scripts)
- Player phones receive input requests and send responses
- All scoring, timing, phase transitions, and rules live server-side

---

## The Three Layers

### 1. Game Logic (Server — QuickJS in Durable Object)

The game script runs server-side and orchestrates the entire game through the `room.*` API:

```javascript
// Server script — runs in QuickJS sandbox inside the DO
exports.run = async function(room, config) {
  await room.setPhase("playing");
  
  var answers = await room.requestInput("round-1", {
    type: "text",
    prompt: "Finish the sentence...",
    timeLimit: 30
  });
  
  await room.updateSharedData({
    phase: "reveal",
    answers: formatForDisplay(answers)
  });
  
  // Host will render this with Godot animations
  // Players will see a waiting screen
};
```

### 2. Host Display (Godot or React Native, per phase)

The host screen is what everyone watches on the TV. It receives `sharedData` updates over WebSocket and renders them.

For **simple phases** (lobby, waiting), React Native is sufficient — show the room code, player list, "waiting for answers..."

For **spectacle phases** (reveal, voting results, winner), Godot renders animated transitions, plays sound effects, runs shaders, and makes the experience feel like a real game show.

The game definition declares which phases need Godot:

```json
{
  "party": {
    "hostRendering": {
      "lobby": "react-native",
      "answering": "react-native",
      "reveal": "godot",
      "voting": "react-native",
      "round_results": "godot",
      "scores": "godot",
      "winner": "godot"
    }
  }
}
```

When a phase transitions from React Native to Godot, the host loads the engine (if not already loaded) and hands off rendering. The `GameRuntimeGodot` component receives the phase data and plays the appropriate scene.

### 3. Player Input (React Native + Skia, always)

Player phones are controllers. They show:
- Text input fields
- Multiple choice buttons
- Buzzers
- Drawing canvases (Skia)
- Voting lists
- Wheel spinners

These are the existing `app/components/party/` components: `AnswerInput`, `BuzzerInput`, `VoteList`, `DrawingInput`, `WheelInput`, `MicInput`, `InvestmentInput`, `MatchingInput`.

No changes needed to the player experience for the Godot integration — it's purely a host-side upgrade.

---

## MVP vs Future

### MVP: amen.games Launch (No Host Godot)

For the Easter launch, the host display uses React Native for everything. This is the current state and it works. The games are playable, the infrastructure is solid, and the content pipeline is ready.

**MVP scope:**
- Server-side game logic in QuickJS (done)
- Player input via React Native (done)
- Host display via React Native phase components (done)
- 4-digit room codes, lobbies, scoring (done)
- Hibernation API for cost efficiency (done)
- Rate limiting and collision detection (done)
- Content generation pipeline for amen.games games
- Production deployment and live testing
- 8+ party games with curated content packs

**What the MVP host display looks like:** Clean, readable UI with room codes, player lists, prompts, answers, votes, and scoreboards. Functional but not flashy. Good enough for church game nights.

### Phase 2: Godot Host Display

After MVP launch, upgrade the host display to use Godot for spectacle phases:

- Animated answer reveals (cards flipping, sliding in)
- Sound effects (drumroll for results, applause for winners)
- Shader transitions between phases
- Score celebration animations (confetti, fireworks)
- Physics-driven elements (scores falling into place, winner podium)

This is purely additive — the React Native fallback stays for simple phases and for any game that doesn't define Godot scenes.

### Phase 3: Unified Game Builder

The game editor (`/editor/[id]`) already lets users build games with the engine. Extend it so users can build party games too:

- Party game templates in the editor
- Server script editing (with QuickJS sandbox preview)
- Phase configuration (which phases use Godot)
- Host scene design (using the existing entity/prefab system)
- Input type selection for player phones
- Content pack authoring (prompts, questions, categories)

The key API alignment needed:

| Capability | Engine Games (today) | Party Games (today) | Unified (future) |
|------------|---------------------|--------------------|--------------------|
| Game definition | `GameDefinition` with prefabs/entities | `manifest.json` with party config | Single `GameDefinition` with optional `party` section |
| Scripts | `scriptRef` on entities, `ctx.*` API | `serverScript` field, `room.*` API | Both APIs available, `room.*` for multiplayer orchestration, `ctx.*` for entity control |
| Rendering | Godot always | React Native always | Per-screen, per-phase choice |
| Input | Godot bridge input events | React Native components | React Native components for party, Godot for single-player |
| State | Client-side EntityManager | Server-side DO + WebSocket | Server-authoritative for multiplayer, client for single-player |

### Phase 4: Hybrid Games

Games that combine physics gameplay (Godot) with party mechanics (multiplayer input collection). Example: a party game where the host display shows a physics simulation and players influence it from their phones.

This requires the Godot host display to receive real-time input from the server, not just phase-level state updates. The bridge already supports this (`GodotBridge` can receive messages and update entities), so the plumbing exists.

---

## API Alignment Strategy

The two scripting APIs (`room.*` for party, `ctx.*` for engine) serve different purposes and should stay separate. But they should be accessible from the same game definition format.

### Current: Two Separate Worlds

```
Engine game: GameDefinition -> GameRuntimeGodot -> ctx.spawn(), ctx.applyForce()
Party game:  manifest.json -> PartyRoomDO -> room.setPhase(), room.requestInput()
```

### Target: One Definition, Multiple Runtimes

```
GameDefinition {
  // Standard engine fields (prefabs, entities, scripts, physics)
  prefabs: [...],
  entities: [...],
  
  // Party extension
  party: {
    serverScript: "server",
    contentPacks: ["quip"],
    phases: ["lobby", "answering", "reveal", ...],
    inputTypes: ["text", "choice", "buzzer"],
    hostRendering: {
      "reveal": "godot",
      "scores": "godot",
      ...
    }
  }
}
```

A game with only `party` fields → pure party game (current behavior).
A game with only engine fields → pure engine game (current behavior).
A game with both → hybrid (Phase 4).

The `manifest.json` format used by party games today is a subset of `GameDefinition`. The build step (`sync-r2.ts`) already generates `definition.json` from `manifest.json`. The convergence path is to make `GameDefinition` the single schema and have party-specific fields live in the `party` section.

---

## Content & Asset Pipeline

Party games need content (prompts, questions, trivia facts) and visual assets (backgrounds, character sprites, UI elements). The existing asset pipeline handles visual generation. Content generation is handled by the content CLI (`pnpm content cli`).

### For MVP (amen.games)
- Content packs generated via AI with moderation pipeline
- Visual assets are minimal (React Native UI, themed with NativeWind)
- No per-game sprite generation needed

### For Phase 2+ (Godot Host)
- Host scenes need visual assets (backgrounds, animations, particle textures)
- The existing `asset-pack-generation` pipeline can generate these
- Sound effects via ElevenLabs SFX API (pipeline already exists)
- The game definition's asset references resolve to R2 URLs, same as engine games

---

## Summary

| Timeframe | What | Host Display | Player Input | Game Logic |
|-----------|------|-------------|-------------|------------|
| **MVP** (now) | amen.games launch | React Native | React Native + Skia | Server QuickJS |
| **Phase 2** | Godot host | Godot for spectacle, RN fallback | React Native + Skia | Server QuickJS |
| **Phase 3** | User-built party games | Godot or RN (game decides) | React Native + Skia | Server QuickJS |
| **Phase 4** | Hybrid games | Godot with live input | React Native + Skia | Server QuickJS + client ECS |

The north star: **any screen, any rendering stack, the platform handles the rest.** Party games are the first proof of this vision — phones stay light, the shared display gets heavy when it needs to, and the server owns the truth.
