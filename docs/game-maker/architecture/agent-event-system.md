# Agent Event System Architecture

> How a game goes from user prompt to playable game, and what the user sees along the way.

---

## The Big Picture

```
User types prompt
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RunCoordinatorDO (Brain)                      │
│                                                                 │
│  RunState: { status, currentStepIndex, gateValues, ... }        │
│  EventStore: seq-ordered append-only log                        │
│  WebSocket Hub: broadcasts to all connected clients             │
│                                                                 │
│  Loop:                                                          │
│    1. Determine stage for current stepIndex                     │
│    2. Dispatch to RunStepWorkerDO                               │
│    3. Receive result → emit events → advance index → repeat     │
│                                                                 │
└──────────┬──────────────────────────────────┬───────────────────┘
           │ POST /internal/execute           │ WebSocket broadcast
           ▼                                  ▼
┌──────────────────────┐          ┌──────────────────────────────┐
│  RunStepWorkerDO     │          │  React Native App            │
│  (Muscle)            │          │                              │
│                      │          │  useAgentRun     → raw events│
│  StageExecutor       │          │  useCreateGameChat → messages│
│  LLM calls + tools   │          │  ChatTimeline    → UI        │
│  askUser suspension  │          │                              │
└──────────────────────┘          └──────────────────────────────┘
```

---

## Steps and Stages

A **Run** is divided into exactly **5 steps**, each mapped to a **stage**:

| Step Index | Stage      | What It Does                                             |
|------------|------------|----------------------------------------------------------|
| 0          | `planning` | Extracts requirements from prompt via gate loop + LLM    |
| 1          | `build`    | Generates initial `GameDefinition` JSON                  |
| 2          | `refine`   | Validates and iterates on the definition                 |
| 3          | `theme`    | Creates a `ThemePlan` (colors, art prompts per template) |
| 4          | `asset`    | Runs the image generation pipeline (Scenario/Modal)      |

The mapping is deterministic:

```typescript
// api/src/agent/run-state-machine.ts
function getStage(stepIndex: number) {
  const order = ['planning', 'build', 'refine', 'theme', 'asset'];
  return order[stepIndex % order.length];
}
```

### What Lives on a Step (D1 `agent_steps` table)

```typescript
{
  id: string;            // "runId:step:0"
  runId: string;
  stepIndex: number;     // 0-4
  stage: string;         // planning | build | refine | theme | asset
  status: string;        // queued | running | succeeded | failed | skipped
  inputHash?: string;
  outputArtifactKey?: string;  // R2 key → the actual output (markdown, JSON, etc.)
  costMicros: number;
  errorMessage?: string;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
}
```

The heavy data (planning doc, game definition JSON, theme plan, asset batch result) is stored in **R2** at:
```
agent-runs/{runId}/steps/{stepIndex}/{stage}/output.json
```

The step record only holds the R2 key pointer (`outputArtifactKey`).

---

## Events: The Real-Time Stream

Events are the real-time feed of what's happening. They power the chat UI.

### Storage: Dual-Write

Every event is written to **two places**:

1. **Durable Object Storage** — for fast WebSocket replay on reconnect (capped at 1000 events)
2. **D1 `agent_events` table** — permanent audit log

### Event Envelope

```typescript
{
  seq: number;           // monotonically increasing (1, 2, 3...)
  stateVersion: number;  // bumps on every status transition
  eventType: string;     // discriminator
  payload: object;       // type-specific data (see below)
  timestamp: number;     // epoch ms
}
```

### All Event Types

#### Step Lifecycle Events

These mark the start/end of each of the 5 stages.

| Event | Payload | When It Fires | Chat Rendering |
|-------|---------|---------------|----------------|
| `step_started` | `{ stepId, stepIndex, stage }` | Step dispatched to worker | System status: "Starting build phase..." |
| `step_completed` | `{ stepId, stepIndex, outputArtifactKey? }` | Worker reports success | System status: "Completed step 1" |
| `step_failed` | `{ stepId, stepIndex, errorMessage }` | Worker reports failure | (triggers `run_failed` next) |

#### Planning Gate Events

These fire during step 0 (planning) as the LLM extracts requirements from the prompt.

| Event | Payload | When It Fires | Chat Rendering |
|-------|---------|---------------|----------------|
| `gate_values_updated` | `{ stage, gateValues, satisfiedFields, unsatisfiedFields }` | After each gate LLM iteration | System status: "3 requirements met" |
| `planning_complete` | `{ stage, finalGateValues }` | All gates satisfied | Agent text: "Planning complete!" |

The gate loop works like this:
1. LLM reads the prompt and tries to fill 4 gates: `core_game_loop`, `win_lose_conditions`, `theme_style`, `game_type_category`
2. If any gate is unsatisfied → emit `clarification_requested` and pause
3. User answers → loop again
4. All gates satisfied → emit `planning_complete` and advance to step 1

#### Interaction Events (User <-> Agent)

These pause the run and wait for user input.

| Event | Payload | When It Fires | Chat Rendering |
|-------|---------|---------------|----------------|
| `clarification_requested` | `{ questionId, question, stage, stepIndex, context? }` | Planning gates need info | Agent bubble with question text (pending) |
| `clarification_answered` | `{ questionId, answer }` | User submits text answer | Marks question as answered + shows user answer bubble |
| `user_question` | `{ batchId, questions[], stage, stepIndex }` | `askUser` tool called during execution | Agent bubble with structured question card (pending) |
| `user_answer` | `{ batchId, answers[][] }` | User submits structured answers | Marks question card as answered |

**Key difference**: `clarification_requested/answered` is simple text Q&A from the planning gate loop. `user_question/answer` is structured multi-choice from the LLM's `askUser` tool during build/refine/theme stages.

#### Run Lifecycle Events

| Event | Payload | When It Fires | Chat Rendering |
|-------|---------|---------------|----------------|
| `run_completed` | `{ totalSteps, totalCostMicros }` | All 5 steps done | Completion card: "Your game is ready!" |
| `run_failed` | `{ errorMessage }` | Terminal failure | Error message |
| `run_paused` | `{ reason? }` | User pauses | System status: "Run paused" |
| `run_resumed` | `{}` | User resumes | (not currently rendered) |
| `run_canceled` | `{ reason? }` | User cancels | System status: "Run was canceled" |

#### Operational Events

| Event | Payload | When It Fires | Chat Rendering |
|-------|---------|---------------|----------------|
| `cost_recorded` | `{ costMicros, provider, model }` | After each LLM call | Not rendered (internal) |
| `checkpoint_ready` | `{ checkpointId, stepIndex }` | After step result persisted | Not rendered (internal) |
| `error` | `{ errorMessage, errorContext? }` | System errors, recovery attempts | Error message in chat |

#### Future Events (Schema-Only, Not Yet Emitted)

| Event | Payload | Purpose |
|-------|---------|---------|
| `patch_applied` | `{ stepId, patchDescription }` | Will show incremental game definition changes |
| `asset_preview` | `{ assetId, assetType, publicUrl, thumbnailUrl? }` | Will show generated sprites/backgrounds inline |

---

## Data Flow: Backend to Chat UI

```
RunCoordinatorDO.emitEvent(type, payload)
       │
       ├─→ RunEventStore.append()
       │      ├─→ DO Storage (seq-keyed, for replay)
       │      └─→ D1 INSERT INTO agent_events
       │
       └─→ broadcast() → WebSocket.send() to all clients
                  │
                  ▼
         useAgentRun (React hook)
           ws.onmessage → parse JSON
           setEvents(prev => [...prev, newEvent])
           lastSeqRef tracks highest seen seq
                  │
                  ▼
         useCreateGameChat (React hook)
           useEffect watches events[]
           processedSeqs ref prevents duplicates
           switch(event.eventType) → push ChatMessage
                  │
                  ▼
         ChatTimeline (FlatList)
           renders ChatMessage[] with:
             - text bubbles (agent/user/system)
             - status pills
             - question cards (interactive)
             - error messages
             - completion card
```

### ChatMessage Type

```typescript
type ChatMessageRole = 'user' | 'agent' | 'system';
type ChatMessageType =
  | 'text'           // plain text (markdown supported)
  | 'user_question'  // structured question card
  | 'clarification'  // simple text question
  | 'status'         // system status pill
  | 'error'          // error message
  | 'completion';    // "Your game is ready!"

interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  type: ChatMessageType;
  text: string;
  timestamp: number;
  payload?: unknown;   // raw event payload for interactive types
  pending?: boolean;   // true = unanswered question
}
```

### Event → ChatMessage Mapping

| AgentEvent | → ChatMessage | role | type |
|------------|---------------|------|------|
| `step_started` | "Starting {stage} phase..." | system | status |
| `step_completed` | "Completed step {n}" | system | status |
| `gate_values_updated` | "{n} requirements met" | system | status |
| `planning_complete` | "Planning complete!" | agent | text |
| `clarification_requested` | question text | agent | clarification |
| `clarification_answered` | answer text | user | text |
| `user_question` | header text | agent | user_question |
| `user_answer` | (marks question answered) | — | — |
| `run_completed` | "Your game is ready!" | system | completion |
| `run_failed` | error message | system | error |
| `run_canceled` | "Run was canceled" | system | status |
| `error` | error message | system | error |
| `cost_recorded` | (not rendered) | — | — |
| `checkpoint_ready` | (not rendered) | — | — |

---

## WebSocket Protocol

### Connection
```
wss://{apiHost}/ws/agent-run/{runId}?lastSeq={n}
```

### Client → Server Messages
```typescript
| { type: 'connect'; runId: string; lastSeq?: number }
| { type: 'pause'; commandId: string }
| { type: 'resume'; commandId: string }
| { type: 'cancel'; commandId: string }
| { type: 'request_snapshot' }
| { type: 'pong' }
```

### Server → Client Messages
```typescript
| { type: 'connected'; runId; status; lastSeq; stateVersion }
| { type: 'event'; seq; stateVersion; eventType; payload; timestamp }
| { type: 'snapshot'; run: RunSnapshot; events: Event[] }
| { type: 'control_ack'; commandId; result; reason? }
| { type: 'ping' }
| { type: 'error'; message; code? }
```

### Reconnection & Replay
1. Client tracks `lastSeqRef` (highest seq seen)
2. On reconnect, passes `lastSeq` in URL
3. Server replays missed events from DO storage
4. Fallback: tRPC polling every 2s when WebSocket is down

---

## Session Persistence (Frontend)

Chat state is managed via **Jotai atoms** at module scope:

```typescript
const runIdAtom = atom<string | undefined>(undefined);
const messagesAtom = atom<ChatMessage[]>([]);
const processedSeqsAtom = atom(new Set<number>());
```

This means:
- Messages survive React re-renders and navigation
- `resetSession()` clears all three atoms for "New Chat"
- Event deduplication uses the `processedSeqs` Set

---

## Extending the System

### Adding a New Event Type

1. **Schema** (`shared/src/types/agent-run.ts`):
   - Add to `AgentEventTypeSchema` enum
   - Add payload shape to `AgentEventPayloadSchema` discriminated union

2. **Emission** (`api/src/agent/RunCoordinatorDO.ts`):
   - Call `this.emitEvent('your_event', { type: 'your_event', ... })` at the right point
   - All events flow through the same `emitEvent → EventStore.append → broadcast` pipeline

3. **Frontend Consumption** (`app/components/create-game/useCreateGameChat.ts`):
   - Add a `case 'your_event':` in the event processing `switch` statement
   - Push a `ChatMessage` with the appropriate `role` and `type`

4. **Rendering** (`app/components/create-game/ChatMessage.tsx`):
   - If using an existing `ChatMessageType`, it renders automatically
   - For new rendering, add a new `ChatMessageType` and a corresponding render branch

### What Should Be an Event vs. Stored on Step?

| Put It On... | When... |
|---------------|---------|
| **Event** | It's something the user should see in real-time (progress, questions, previews) |
| **Event** | It's transient / stream-like (cost updates, status changes) |
| **Step** | It's the final output of a stage (the game definition, the theme plan) |
| **Step** | It needs to survive run completion for later retrieval |
| **Both** | It's a milestone that should be both shown live AND queryable later |
