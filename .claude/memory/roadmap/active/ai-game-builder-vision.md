# AI Game Builder — Product Vision

> **Status:** Active — living document  
> **Created:** 2026-02-06  
> **Last Updated:** 2026-02-06  
> **Scope:** End-to-end AI-powered game creation from a text prompt to a playable game.

---

## The Big Idea

A user should be able to describe any game in natural language — from "pizza shoots out of a cannon" to a detailed snake game spec — and the AI builds it. The experience is a guided, multi-stage wizard where the AI does the heavy lifting and only asks the user questions when it genuinely needs more information.

The user never fills out forms. They describe, the AI interprets, and together they iterate until the game is built.

---

## User Experience

### The Wizard Flow

The game builder is a **multi-page wizard**. Each page represents a phase of creation.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   PROMPT     │ ──→ │  AI PLANNING │ ──→ │   BUILDER    │ ──→ │   PUBLISH    │
│              │     │              │     │              │     │              │
│ Brain dump   │     │ Animated     │     │ Live preview │     │ Share &      │
│ text input   │     │ checklist    │     │ as AI builds │     │ play         │
│              │     │ + Q/A cards  │     │ the game     │     │              │
│   [ Go → ]   │     │ [Continue →] │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### Page 1 — Prompt

The entry point. Completely open-ended.

- A single, large text area: *"Describe the game you want to build..."*
- The user does a brain dump. Could be one sentence or five paragraphs.
- A tier selector (free / standard / pro) for model quality.
- One big button: **"Go"** or **"Create My Game"**.
- That's it. Clean, minimal, inviting.

**Examples of valid prompts:**
- "Pizza shoots out of a cannon"
- "A snake game where the snake is neon green on a dark background, there are 10 levels, each one gets faster"
- "Match-3 puzzle with a candy theme, time limit of 60 seconds, bright colors, cartoon style"
- "I want a physics platformer"

### Page 2 — AI Planning

After clicking Go, the user lands on the planning page. This is where the AI works.

**Initial state:** A fun loading spinner — "AI is reading your prompt..."

**Then the checklist appears:** Four items (from the planning gate config), each starting as empty/pending:

```
○  Core Game Loop         ← spinner
○  Win/Lose Conditions    ← spinner
○  Theme & Style          ← spinner
○  Game Type              ← spinner
```

**As the AI fills each one:** The spinner becomes a checkmark with a subtle animation. The AI's extracted text fades in beneath the label:

```
✓  Core Game Loop
   "Match candies in groups of 3+ to clear them and score points"
   
✓  Win/Lose Conditions
   "Win by reaching 1000 points. Lose if no more moves available."
   
○  Theme & Style          ← still thinking...
○  Game Type              ← still thinking...
```

**If the AI has questions:** A question card pops up below the checklist. Could be free text or multiple choice. The user answers, the AI re-evaluates.

```
┌─ QUESTION ──────────────────────────────────────┐
│                                                   │
│  "What color scheme should the candies use?       │
│   Your prompt mentions 'candy-themed' but         │
│   doesn't specify colors."                        │
│                                                   │
│  [ Free text input                          ]     │
│  [ Submit Answer ]                                │
└───────────────────────────────────────────────────┘
```

**"Continue" button** is disabled until all 4 items are checked. Once the AI is satisfied, Continue enables — maybe a subtle celebration animation. The user clicks Continue to move on.

### Page 3 — Builder (Future)

The AI starts generating the actual game engine code. The user sees:
- A live preview of the game being built
- A phase timeline (build → refine → theme → asset)
- The AI can still ask questions in any phase
- Real-time progress as each stage completes

### Page 4 — Publish (Future)

The finished game. Share link, play button, edit options.

---

## Architecture Principles

### 1. YAML Gate Configs Are the Single Source of Truth

Every stage has a YAML config file defining what information the AI needs:

```yaml
# api/config/stage-gates/planning.yaml
stage: planning
gates:
  - id: core_game_loop
    label: Core Game Loop
    description: What does the player do repeatedly?
    required: true
    ai_extraction_hint: Look for descriptions of player actions, game mechanics, or turn/frame behavior
  - id: win_lose_conditions
    label: Win/Lose Conditions
    description: How does the player win or lose?
    required: true
    ai_extraction_hint: Look for scoring goals, time limits, life systems, failure states
  # ...
```

The YAML is editable without code changes. Add a gate field, and the AI will start looking for it. Remove one, and it stops asking. The code is completely generic.

### 2. The AI GateProcessor Is Generic and Reusable

A single, stateless service handles gate evaluation for ANY stage:

```
Input:  stage config + user prompt + previous Q/A + current gate values
Output: filled gate values + satisfied/unsatisfied lists + questions for gaps
```

It calls an LLM with the `ai_extraction_hint` fields to guide extraction. It only asks questions for things it truly couldn't figure out. It never re-asks about things already answered.

### 3. Every Stage Is a Loop

The pattern is the same at every stage:

```
1. AI tries to fill gate requirements from available context
2. If satisfied → auto-advance to next stage
3. If gaps → ask targeted questions
4. User answers → AI re-evaluates with new context
5. Loop until satisfied
```

The user never manually fills a form. They either provided enough info upfront (in which case the AI silently fills everything and advances) or the AI asks focused questions to fill gaps.

### 4. Events Drive the UI

The server emits real-time events via WebSocket:
- `gate_values_updated` — AI filled some fields (client animates checkmarks)
- `clarification_requested` — AI has a question (client shows question card)
- `clarification_answered` — User answered (client updates history)
- `planning_complete` — All gates satisfied (client enables Continue)
- `stage_advanced` — Moving to next stage (client transitions page)

The UI is reactive — it just renders whatever the event stream tells it.

### 5. Idempotency and Safety Everywhere

Every operation is safe to retry:
- Step execution has checkpoint-based idempotency (don't re-run AI if already succeeded)
- State transitions use CAS guards with version tracking
- Billing has idempotency keys per operation
- Answer submission has ledger-based dedup
- Recovery settles any unsettled billing automatically

---

## Technical Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React Native + NativeWind (Tailwind) |
| **State Management** | WebSocket events + tRPC polling fallback |
| **API** | Hono + tRPC on Cloudflare Workers |
| **Coordination** | Cloudflare Durable Objects (RunCoordinatorDO) |
| **Step Execution** | Cloudflare Durable Objects (RunStepWorkerDO) |
| **AI Models** | Vercel AI SDK (`ai` package) via OpenRouter |
| **Database** | Cloudflare D1 (SQLite) |
| **Object Storage** | Cloudflare R2 |
| **Billing** | Reservation → Settlement → Finalize pattern |
| **Config** | YAML gate files (embedded at build time for Workers) |

---

## Stage Pipeline

The full game creation pipeline:

| Stage | What the AI Does | Gate Examples |
|-------|------------------|---------------|
| **Planning** | Extract game concept from prompt, fill core requirements | Core loop, win/lose, theme, game type |
| **Build** | Generate game engine definition (entities, behaviors, rules) | Valid entity tree, physics config, rule set |
| **Refine** | Improve and balance the game definition | Difficulty curve, edge cases handled |
| **Theme** | Apply visual theme and styling | Color palette, art style, mood |
| **Asset** | Generate sprite images, backgrounds, UI elements | All entities have sprites, background set |

Each stage has its own YAML gate config. For now, only Planning has gates defined. Others will be added as we build them.

---

## What's Built So Far

### Completed (Feb 2026)

**Idempotency & Safety Layer:**
- Worker checkpoint-based replay protection (don't re-run AI for same step)
- Coordinator CAS guards with stateVersion tracking
- Recovery path settles unsettled billing automatically
- Deterministic event IDs for dedupe

**Planning Gate System:**
- YAML config defining 4 required planning fields
- Server-side enforcement in `startRun` (rejects if gates not met)
- Client-side validation with visual checklist

**Clarification Q/A Loop:**
- `waiting_for_input` run status for AI-initiated pauses
- `clarification_requested` / `clarification_answered` event types
- Coordinator endpoints for request-clarification and submit-answer
- Editor UI with question cards and answer history
- Persistent Q/A state that survives reconnection

**Editor UI:**
- AIEditorPanel with gate checklist, Q/A cards, run controls
- useAgentRun hook with WebSocket + tRPC + event processing
- Phase timeline (RunProgress component)

### In Progress

**AI-Driven Planning Loop:**
- Per-stage YAML gate configs with `ai_extraction_hint`
- Generic AI GateProcessor service (LLM-powered extraction + evaluation)
- Coordinator integration (gate loop: extract → Q/A → advance)
- Wizard UI (Page 1: prompt, Page 2: animated checklist + Q/A)

### Future

- Page 3: Live game builder preview
- Page 4: Publish / share
- Gate configs for build/refine/theme/asset stages
- Multiple AI model tiers with different capabilities
- Fork & remix existing games
- Collaborative editing

---

## Key Files

| File | Purpose |
|------|---------|
| `api/config/stage-gates/planning.yaml` | Planning stage gate config (YAML) |
| `api/src/agent/stage-gates.ts` | Generic gate config loader/validator |
| `api/src/agent/engine/gate-processor.ts` | AI-powered gate extraction service |
| `api/src/agent/RunCoordinatorDO.ts` | Run lifecycle state machine |
| `api/src/agent/RunStepWorkerDO.ts` | Step execution with idempotency |
| `api/src/trpc/routes/agent-runs.ts` | tRPC API routes |
| `shared/src/types/agent-run.ts` | Shared type contracts |
| `app/components/editor/AIEditor/` | Editor UI components |

---

## Design Decisions

1. **YAML over database for gate configs**: Editable without deploys (eventually), version-controlled, human-readable. Trade-off: Cloudflare Workers can't read files at runtime, so YAML is embedded in code.

2. **Coordinator handles gate loops, not workers**: The gate evaluation loop is lightweight (one LLM call). Workers are for heavy stage execution (multiple LLM calls with tool use). Keeping gate logic in the coordinator avoids unnecessary DO-to-DO communication.

3. **Events over polling for UI updates**: WebSocket events give instant feedback for the animated checklist. Polling fallback for reliability.

4. **Single GateProcessor, multiple configs**: One generic service handles all stages. The YAML config is the only thing that changes. This keeps the codebase DRY and makes adding new stages trivial.

5. **User never fills forms**: The entire point is that the AI does the work. The user describes, the AI interprets. Manual form-filling defeats the purpose.
