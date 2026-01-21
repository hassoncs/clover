# Clover Game Maker - Implementation Roadmap

> **AI-Powered 2D Game Maker for Kids**
> Turn natural language into playable physics games in under 30 seconds.

**Target Audience**: Children ages 6-14 and casual creators  
**Tech Stack**: React Native (Expo) + Skia + Box2D (JSI/WASM) + tRPC + Cloudflare D1  
**Success Metric**: >80% of prompts produce playable games; <30 seconds to play

---

## Current Progress Summary

| Phase | Status | Progress |
|-------|--------|----------|
| Phase 0: Infrastructure | **90% Complete** | D1 + API done, Auth needs E2E test |
| Phase 1: Entity System | **95% Complete** | EntityManager, renderers, physics mapping done |
| Phase 2: Behavior System | **85% Complete** | Most behaviors implemented |
| Phase 3: Rules Engine | **90% Complete** | Rules, win/lose conditions done |
| Phase 4: Game Runtime | **80% Complete** | Core runtime works, needs camera/polish |
| Phase 5: AI Generation | Not Started | 0% |
| Phase 6: Asset Generation | Not Started | 0% |
| Phase 7: Visual Editor | Not Started | 0% |
| Phase 8: Sound & Polish | Not Started | 0% |
| Phase 9: User Experience | Not Started | 0% |
| Phase 10: Launch Prep | Not Started | 0% |

---

## Immediate Next Steps (Priority Order)

### 1. Complete Phase 0.4: End-to-End Auth Verification
- [ ] Start services: `pnpm dev`
- [ ] Test Magic Link on iOS simulator
- [ ] Test Magic Link on web browser
- [ ] Verify token persists across app restart
- [ ] Test protected API route returns user data
- [ ] Test logout clears session

### 2. Complete Remaining Phase 1-4 Items
- [ ] EntityManager: `getEntitiesInAABB(min, max)` method
- [ ] EntityManager: entity pooling for frequently spawned entities
- [ ] EntityManager: unit tests
- [ ] Renderers: tint color overlay support
- [ ] Physics: collision filtering (categories, masks)
- [ ] Behavior: `RotateToward` (face target)
- [ ] Behavior: `ControlVirtualDPad`
- [ ] Behavior: touch zones
- [ ] Behavior: `ScoreOnDestroy`
- [ ] Behavior: `Health` (damage/death)
- [ ] Behavior: combo multipliers
- [ ] Rules: `reach_zone` win condition
- [ ] Score: high score persistence (AsyncStorage)
- [ ] Score: multiple score types (points, coins, stars)
- [ ] Game state: persist for resume
- [ ] GameLoader: preload assets (images)
- [ ] GameLoader: report loading progress
- [ ] Camera System: create CameraSystem.ts
- [ ] Camera: position/zoom
- [ ] Camera: follow-target mode
- [ ] Camera: pan/zoom gestures
- [ ] Camera: world bounds clamping
- [ ] Camera: shake effect
- [ ] Input: multi-touch tracking
- [ ] Input: gesture detection (tap, drag, pinch)
- [ ] HUD: pause button
- [ ] Game over: share button
- [ ] GameRuntime: error state handling
- [ ] GameRuntime: fullscreen mode
- [ ] FPS measurement/reporting

### 3. Phase 5: AI Generation Pipeline
- [ ] Create `api/src/ai/` directory
- [ ] Create `api/src/ai/classifier.ts`
- [ ] Define game type enum (launcher, stacker, platformer, etc.)
- [ ] Define mechanic enum (jump, shoot, balance, drive, swing)
- [ ] Define theme enum (space, jungle, ocean, desert, city)
- [ ] Implement LLM-based classification
- [ ] Create base templates for each game type
- [ ] Create `api/src/ai/generator.ts`
- [ ] Design system prompts for game generation
- [ ] Integrate Claude API (primary)
- [ ] Implement validation & self-correction
- [ ] Create `games.generate` tRPC mutation
- [ ] Create `games.refine` tRPC mutation

---

## Phase Details

### Phase 0: Infrastructure [90% COMPLETE]

#### 0.1 Supabase Setup
- [ ] Create Supabase project for Clover at supabase.com
- [ ] Enable Email (Magic Link) auth provider
- [ ] Enable Google OAuth provider
- [ ] Enable Apple OAuth provider (for iOS)
- [ ] Add redirect URL: `clover://auth/callback` (native)
- [ ] Add redirect URL: `http://localhost:8081/auth/callback` (dev)
- [ ] Copy Supabase URL to `.hush`
- [ ] Copy Supabase Anon Key to `.hush`
- [ ] Copy Supabase Service Role Key to `.hush`
- [ ] Run `pnpm hush:encrypt` to encrypt secrets

#### 0.2 Cloudflare D1 Database [COMPLETE]
- [x] Run `cd api && npx wrangler d1 create clover-db`
- [x] Copy database_id to `api/wrangler.toml`
- [x] Uncomment D1 binding in `api/wrangler.toml`
- [x] Run `pnpm --filter @clover/api db:push` to create tables
- [x] Verify tables created

#### 0.3 API Routes Implementation [COMPLETE]
- [x] Update `api/src/trpc/context.ts` to include DB binding
- [x] Implement `games.list` query
- [x] Implement `games.get` query
- [x] Implement `games.create` mutation
- [x] Implement `games.update` mutation
- [x] Implement `games.delete` mutation
- [x] Add input validation with Zod
- [x] Create tests with Vitest (4/4 passing)

#### 0.4 End-to-End Auth Verification
- [ ] Test Magic Link flow on iOS and Web
- [ ] Verify session persistence
- [ ] Confirm protected API routes work

---

### Phase 1: Core Game Engine [95% COMPLETE]

#### 1.1 GameDefinition Schema [COMPLETE]
- [x] Create `shared/src/types/index.ts` barrel export
- [x] Define GameDefinition, WorldConfig, EntityTemplate, GameEntity interfaces
- [x] Define Transform, SpriteComponent, PhysicsComponent types
- [x] Create Zod schemas for runtime validation
- [x] Export types from `@clover/shared`

#### 1.2 EntityManager Implementation [90% COMPLETE]
- [x] Create EntityManager with CRUD operations
- [x] Template resolution with inheritance
- [x] Tag-based querying
- [ ] Spatial queries (AABB overlap)
- [ ] Entity pooling
- [ ] Unit tests

#### 1.3 Transform System [COMPLETE]
- [x] Physics-to-transform sync
- [x] Coordinate conversion helpers
- [x] Scale support in rendering

#### 1.4 Sprite Renderers [95% COMPLETE]
- [x] RectRenderer, CircleRenderer, PolygonRenderer, ImageRenderer
- [x] EntityRenderer (type switch)
- [x] Z-index/layer ordering
- [x] Opacity support
- [x] Shadow effects
- [ ] Tint color overlay

#### 1.5 Physics Component Mapping [90% COMPLETE]
- [x] All body types (static, kinematic, dynamic)
- [x] All shapes (box, circle, polygon)
- [x] Fixture properties (density, friction, restitution)
- [x] Sensor bodies
- [ ] Collision filtering (categories, masks)

---

### Phase 2: Behavior System [85% COMPLETE]

#### 2.1 Behavior Framework [COMPLETE]
- [x] BehaviorExecutor with execution phases
- [x] BehaviorContext with full game access
- [x] Enable/disable support

#### 2.2 Movement Behaviors [90% COMPLETE]
- [x] move (linear velocity)
- [x] move_patrol (back-and-forth)
- [x] follow (homing)
- [x] oscillate (sine wave)
- [x] rotate (continuous)
- [ ] rotate_toward (face target)

#### 2.3 Input/Control Behaviors [80% COMPLETE]
- [x] tap_to_jump
- [x] drag_to_aim (slingshot)
- [x] tilt_to_move (accelerometer)
- [x] virtual_buttons
- [ ] virtual_dpad
- [ ] Touch zones

#### 2.4 Event/Lifecycle Behaviors [COMPLETE]
- [x] spawn_on_event
- [x] destroy_on_collision
- [x] timer (timed destruction/callbacks)
- [x] animate (frame animation)

#### 2.5 Scoring Behaviors [60% COMPLETE]
- [x] score_on_collision
- [ ] score_on_destroy
- [ ] health (damage/death)
- [ ] Combo multipliers

---

### Phase 3: Game Rules Engine [90% COMPLETE]

#### 3.1 Rules Evaluator [COMPLETE]
- [x] RulesEvaluator with triggers, conditions, actions
- [x] All trigger types (collision, timer, score, entity_count, event, frame)
- [x] All condition types (score, time, entity_exists, entity_count, random)
- [x] All action types (spawn, destroy, score, game_state, event)

#### 3.2 Win/Lose Conditions [90% COMPLETE]
- [x] destroy_all, reach_score, survive_time, entity_destroyed
- [ ] reach_zone

#### 3.3 Game State Machine [90% COMPLETE]
- [x] States: loading, ready, playing, paused, won, lost
- [x] State transitions and callbacks
- [x] Restart/replay support
- [ ] Persist state for resume

#### 3.4 Score Manager [70% COMPLETE]
- [x] Current score tracking
- [x] Score change events
- [ ] High score persistence
- [ ] Multiple score types

---

### Phase 4: Game Runtime [80% COMPLETE]

#### 4.1 Game Loader [80% COMPLETE]
- [x] Parse GameDefinition JSON
- [x] Validate with Zod schema
- [x] Resolve templates and create entities
- [x] Initialize physics world
- [ ] Preload assets (images)
- [ ] Loading progress reporting

#### 4.2 Game Loop Integration [90% COMPLETE]
- [x] Behaviors execute each frame
- [x] Rules evaluate each frame
- [x] Transform sync from physics
- [ ] FPS measurement

#### 4.3 Input Manager [70% COMPLETE]
- [x] Touch events → world coords
- [x] Route input to behaviors
- [ ] Multi-touch tracking
- [ ] Gesture detection

#### 4.4 Camera System [0% COMPLETE]
- [ ] Camera position/zoom
- [ ] Follow-target mode
- [ ] Pan/zoom gestures
- [ ] World bounds clamping
- [ ] Shake effect

#### 4.5 Game UI Overlay [80% COMPLETE]
- [x] Score, timer, lives display
- [x] Game over screen (win/lose)
- [x] Restart button
- [ ] Pause button
- [ ] Share button

#### 4.6 GameRuntime Component [85% COMPLETE]
- [x] Accept GameDefinition prop
- [x] Orchestrate all systems
- [x] Loading state handling
- [x] Play/pause/restart methods
- [ ] Error state handling
- [ ] Fullscreen mode

---

### Phase 5: AI Generation Pipeline [0% COMPLETE]

- [ ] Prompt classification (game type, mechanic, theme)
- [ ] Base templates (launcher, stacker, platformer, etc.)
- [ ] LLM integration (Claude/OpenAI)
- [ ] Validation & self-correction loop
- [ ] `games.generate` and `games.refine` endpoints

---

### Phase 6: Asset Generation [0% COMPLETE]

- [ ] DALL-E/Stable Diffusion integration
- [ ] Style consistency across assets
- [ ] R2 storage for generated assets
- [ ] Placeholder system with async replacement

---

### Phase 7: Visual Game Editor [0% COMPLETE]

- [ ] Scene canvas with pan/zoom
- [ ] Entity selection/manipulation
- [ ] Property inspector
- [ ] Behavior editor
- [ ] Rules editor
- [ ] Asset library
- [ ] Play testing integration

---

### Phase 8: Sound & Polish [0% COMPLETE]

- [ ] Sound system (expo-av)
- [ ] Sound library (collision, score, win/lose)
- [ ] Haptic feedback
- [ ] Particle effects
- [ ] Performance optimization

---

### Phase 9: User Experience [0% COMPLETE]

- [ ] Onboarding flow
- [ ] Tutorial system
- [ ] Game library screen
- [ ] Sharing features

---

### Phase 10: Launch Preparation [0% COMPLETE]

- [ ] App Store assets
- [ ] Platform compliance (COPPA)
- [ ] Content moderation
- [ ] Analytics & monitoring
- [ ] Beta testing
- [ ] Store submissions

---

## Key Files Reference

### Core Engine (Implemented)
```
app/lib/game-engine/
├── index.ts
├── types.ts
├── EntityManager.ts
├── BehaviorExecutor.ts
├── BehaviorContext.ts
├── RulesEvaluator.ts
├── GameLoader.ts
├── GameRuntime.tsx
└── renderers/
    ├── index.ts
    ├── EntityRenderer.tsx
    ├── RectRenderer.tsx
    ├── CircleRenderer.tsx
    ├── PolygonRenderer.tsx
    └── ImageRenderer.tsx
```

### Shared Types (Implemented)
```
shared/src/types/
├── index.ts
├── common.ts
├── sprite.ts
├── physics.ts
├── behavior.ts
├── entity.ts
├── rules.ts
├── GameDefinition.ts
└── schemas.ts (Zod validation)
```

### API Routes (Implemented)
```
api/src/trpc/routes/
├── games.ts
├── users.ts
├── assets.ts
└── games.test.ts
```

---

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Generation Success Rate | >80% | N/A (AI not implemented) |
| Time to Play | <30 seconds | N/A |
| Frame Rate | 60fps | Untested at scale |
| Crash Rate | <0.1% | N/A |
| API Test Coverage | 100% | 4/4 passing |

---

*Last Updated: January 2026*
