# Party Platform Phase 3-4 Roadmap (Deferred, Scheduled)

## Purpose

Preserve and schedule all high-value work that is **not** part of immediate Phase 1-2 execution, so no analysis is lost and sequencing remains clear.

---

## Scheduling Model

- **Phase 3 target window**: immediately after Phase 1-2 completion (estimated Week 4 onward).
- **Phase 4 target window**: after Phase 3 platform primitives are validated.
- **Rule**: No game-specific implementation should bypass platform dependencies defined below.

---

## Phase 3 (Platform Expansion for Broad Reuse)

### 3.1 Team System (Core)
- Team assignment (random, balanced, manual override)
- Team scoring and team-targeted broadcasts
- Team-targeted input requests
- Unlocks: Poll Mine class games, cooperative-vs-competitive hybrids, team debate games

### 3.2 Audience/Spectator Role
- `audience` connection role
- Audience vote participation policies
- Non-player state subscriptions with safe write restrictions
- Unlocks: high-participation modes, streamer audience integration

### 3.3 Bracket/Tournament Engine
- Generic bracket generation (single elimination baseline)
- Vote advancement + tie resolution policy
- Optional prediction overlays
- Unlocks: design-battle, comedy bracket, tournament game families

### 3.4 Host Display Layer Generalization
- Game-specific host renderers (TV/cast view)
- Shared host phase widgets and transitions
- Unlocks: proper couch-party UX parity across games

### 3.5 Content Type Expansion (Data Layer)
- Add missing party-specific schemas:
  - scenario prompts
  - role cards
  - survey evidence prompts
  - sound challenge prompts
- Moderation strategy for each type

---

## Phase 4 (Advanced Mechanics Infrastructure)

### 4.1 Hidden-Role Framework
- Private role assignment lifecycle
- Reveal rules and audit-safe role state handling
- Unlocks: faker/alien/criminal/outlier game classes

### 4.2 Private Messaging Channels
- Secure player-to-player DM routing
- Conversation scoping by game phase
- Unlocks: social/dating/secret negotiation mechanics

### 4.3 Concurrent Editing Core
- Multi-user shared text editing primitive
- Multi-user shared drawing synchronization primitive
- Conflict strategy (operational transform or CRDT-style approach)
- Unlocks: chaos text games, collaborative canvas games

### 4.4 Mic-First Game Primitives
- Clip capture/trim/replay workflows
- Safe moderation path for user-recorded audio
- Volume/timing extraction for game controls
- Unlocks: sound imitation and presentation/performance game families

### 4.5 Advanced Real-Time Systems (Optional Gate)
- Shared physics boards
- Rhythm synchronization/calibration stack
- Larger-scale game loops requiring strict timing consistency

---

## Dependency Matrix (What Must Come First)

| Capability | Depends On | Blocks |
|---|---|---|
| Team system | Phase 1-2 core input + routing | Team-based games |
| Audience role | Core websocket role model updates | Mass audience/voting games |
| Bracket engine | Generic phase router | Tournament games |
| Hidden-role framework | `sendToPlayer` + private state | Social deduction games |
| Private messaging | per-player routing + role/session controls | Social/dating games |
| Concurrent editing | drawing + input framework maturity | Chaos/co-draw games |
| Mic-first primitives | existing mic capture + moderation workflow | Voice/sound games |

---

## Deferred Backlog Buckets (for later execution plans)

### Bucket A: High Reuse / Medium Complexity
- Team system
- Audience role
- Bracket engine
- Host display generalization

### Bucket B: High Reuse / High Complexity
- Hidden-role framework
- Private messaging
- Concurrent editing

### Bucket C: Specialized / Optional Gate
- Mic-first game systems
- Real-time physics/rhythm advanced systems

---

## Exit Criteria To Start Phase 3

- Phase 1-2 plan completed and verified.
- Shared utility layer adopted by baseline templates.
- Per-player and subset input mechanics proven in tests.
- Drawing and buzzer reusable components integrated.
- Content pipeline baseline inventory generated and validated.

---

## Notes

- This roadmap intentionally preserves all analyzed work items not selected for immediate implementation.
- New game implementation plans should reference this roadmap to ensure sequencing discipline and avoid one-off infrastructure.
