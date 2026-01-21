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
| Phase 2: Behavior System | **95% Complete** | All core behaviors implemented ✅ |
| Phase 3: Rules Engine | **95% Complete** | Rules, win/lose conditions done ✅ |
| Phase 4: Game Runtime | **95% Complete** | Runtime + CameraSystem + Pause done |
| Phase 5: AI Generation | **100% Complete** | All backend + API routes wired ✅ |
| Phase 6: Asset Generation | **100% Complete** | Scenario client + tRPC routes wired ✅ |
| Phase 7: Visual Editor | Not Started | 0% (Post-MVP) |
| Phase 8: Sound & Polish | Not Started | 0% (Post-MVP) |
| Phase 9: User Experience | **85% Complete** | MVP screens implemented |
| Phase 10: Launch Prep | Not Started | 0% (Post-MVP) |

### MVP Status: READY FOR E2E TESTING

**Last Updated**: 2026-01-21

The core MVP flow is implemented:
1. ✅ User enters prompt in Create tab
2. ✅ AI generates game via tRPC `games.generate`
3. ✅ User can preview generated game
4. ✅ User can save to library
5. ✅ User can play saved games from Library tab

**Blocking Items for Launch**:
- [ ] Configure Supabase auth (HUMAN TASK - requires account setup)
- [ ] Set API keys in production (HUMAN TASK - OPENROUTER_API_KEY, SCENARIO_API_KEY)
- [ ] E2E testing on real devices (HUMAN TASK)

---

## Immediate Next Steps (Priority Order) - MVP Focus

**The engine and AI backend are ~95% complete. Focus is on E2E testing and polish.**

### 1. AI Generation API Routes - ✅ COMPLETE
- [x] Add `games.generate` tRPC mutation (uses existing `api/src/ai/generator.ts`)
- [x] Add `games.refine` tRPC mutation (uses existing `refineGame` function)
- [x] Add `assets.generate` tRPC mutation (uses existing `api/src/ai/assets.ts`)
- [x] Add `assets.generateBatch` tRPC mutation
- [ ] Test API endpoints with curl/Postman (HUMAN: requires API keys)

### 2. MVP User Interface - ✅ COMPLETE
- [x] Create tab-based navigation: Create | Library | Demos
- [x] CreateGameScreen: prompt input with AI generation
- [x] MyGamesScreen: list saved games from D1
- [x] PlayGameScreen: wrapper around GameRuntime
- [ ] SettingsScreen: API key configuration (dev only) - POST-MVP

### 3. Complete Game Runtime Polish (MEDIUM PRIORITY)
- [x] HUD: pause button
- [ ] Game over: share button (POST-MVP)
- [ ] Input: gesture detection (multi-touch, pinch-to-zoom)
- [ ] GameRuntime: error state handling

### 4. End-to-End MVP Validation (HUMAN TASKS)
- [ ] Test full flow: prompt → generate → play → save (requires API keys)
- [ ] Verify games persist and reload correctly
- [ ] Test on iOS simulator + web + real device

### ALREADY COMPLETED (DO NOT REDO):
- [x] `api/src/ai/classifier.ts` - Game type classification
- [x] `api/src/ai/generator.ts` - LLM game generation with multi-provider support
- [x] `api/src/ai/validator.ts` - Game definition validation
- [x] `api/src/ai/templates.ts` - 5 game templates (projectile, stacker, platformer, vehicle, falling_objects)
- [x] `api/src/ai/scenario.ts` - Scenario.com client for image generation
- [x] `api/src/ai/assets.ts` - Asset generation service with R2 upload
- [x] CameraSystem.ts - position/zoom, follow-target, bounds clamping, shake effect
- [x] `api/src/trpc/routes/games.ts` - Full games router with generate/refine
- [x] `api/src/trpc/routes/assets.ts` - Full assets router with generate/generateBatch

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

### Phase 2: Behavior System [95% COMPLETE] ✅

#### 2.1 Behavior Framework [COMPLETE]
- [x] BehaviorExecutor with execution phases
- [x] BehaviorContext with full game access
- [x] Enable/disable support

#### 2.2 Movement Behaviors [100% COMPLETE] ✅
- [x] move (linear velocity)
- [x] move_patrol (back-and-forth)
- [x] follow (homing)
- [x] oscillate (sine wave)
- [x] rotate (continuous)
- [x] rotate_toward (face target) - `BehaviorExecutor.ts:615`
- [x] bounce (boundary bounce)
- [x] gravity_zone (area gravity effects)
- [x] magnetic (attract/repel)

#### 2.3 Input/Control Behaviors [90% COMPLETE]
- [x] tap_to_jump
- [x] drag_to_aim (slingshot)
- [x] tilt_to_move (accelerometer)
- [x] virtual_buttons
- [x] draggable (drag entities with physics)
- [ ] virtual_dpad (POST-MVP)
- [ ] Touch zones (POST-MVP)

#### 2.4 Event/Lifecycle Behaviors [COMPLETE]
- [x] spawn_on_event
- [x] destroy_on_collision
- [x] timer (timed destruction/callbacks)
- [x] animate (frame animation)

#### 2.5 Scoring/Combat Behaviors [100% COMPLETE] ✅
- [x] score_on_collision
- [x] score_on_destroy - `BehaviorExecutor.ts:477`
- [x] health (damage/death with invulnerability) - `BehaviorExecutor.ts:485`
- [ ] Combo multipliers (POST-MVP)

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

#### 4.4 Camera System [95% COMPLETE]
- [x] Camera position/zoom
- [x] Follow-target mode
- [ ] Pan/zoom gestures (input handling)
- [x] World bounds clamping
- [x] Shake effect

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

### Phase 5: AI Generation Pipeline [100% COMPLETE] ✅

- [x] Prompt classification (game type, mechanic, theme) - `api/src/ai/classifier.ts`
- [x] Base templates (projectile, stacker, platformer, vehicle, falling_objects) - `api/src/ai/templates.ts`
- [x] LLM integration (OpenAI/Anthropic/OpenRouter) - `api/src/ai/generator.ts`
- [x] Validation & self-correction loop - `api/src/ai/validator.ts`
- [x] Wire up `games.generate` tRPC mutation - `api/src/trpc/routes/games.ts:269`
- [x] Wire up `games.refine` tRPC mutation - `api/src/trpc/routes/games.ts:348`
- [x] Wire up `games.analyze` (prompt analysis) - `api/src/trpc/routes/games.ts:397`
- [x] Wire up `games.validate` (definition validation) - `api/src/trpc/routes/games.ts:409`

---

### Phase 6: Asset Generation [100% COMPLETE] ✅

- [x] Scenario.com integration (pixel art, backgrounds, UI) - `api/src/ai/scenario.ts`
- [x] Style consistency across assets (model matrix per entity type) - `api/src/ai/assets.ts`
- [x] R2 storage for generated assets - `AssetService.uploadToR2()`
- [x] Placeholder system with async replacement - `createPlaceholderResult()`
- [x] Wire up `assets.generate` tRPC mutation - `api/src/trpc/routes/assets.ts:44`
- [x] Wire up `assets.generateBatch` tRPC mutation - `api/src/trpc/routes/assets.ts:125`
- [x] Wire up `assets.list` and `assets.get` - `api/src/trpc/routes/assets.ts:182,228`
- [ ] Integration with game generation pipeline (auto-generate assets during game gen) - POST-MVP

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

### Phase 9: User Experience [80% COMPLETE] - **MVP READY**

**MVP UI has been implemented!**

#### 9.1 App Navigation [MVP] - COMPLETE
- [x] Tab-based navigation: Create | Library | Demos
- [x] Stack navigation for game play flow

#### 9.2 Create Game Screen [MVP] - COMPLETE
- [x] Prompt input text field
- [x] "Generate" button with loading state
- [x] Preview of generated game (Play button)
- [x] "Play" and "Save" actions

#### 9.3 Game Library Screen [MVP] - COMPLETE
- [x] List saved games from D1
- [x] Tap to play
- [x] Long press to delete

#### 9.4 Post-MVP UX
- [ ] Onboarding flow
- [ ] Tutorial system
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
