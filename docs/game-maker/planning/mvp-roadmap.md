# MVP Roadmap

Development phases for the AI-Powered Mobile Game Maker.

**Last Updated**: 2026-01-21

> ⚠️ **Note**: This document contains the original planning estimates. For current implementation status, see [implementation-roadmap.md](./implementation-roadmap.md).

---

## Phase Overview

| Phase | Focus | Duration | Status |
|-------|-------|----------|--------|
| **Phase 1** | Core Engine | 2-3 weeks | ✅ **COMPLETE** |
| **Phase 2** | Game Framework | 2-3 weeks | ✅ **COMPLETE** |
| **Phase 3** | AI Integration | 2-3 weeks | ✅ **COMPLETE** |
| **Phase 4** | User Studio | 3-4 weeks | ⬜ Post-MVP |
| **Phase 5** | Polish & Launch | 2-3 weeks | 🔄 In Progress |

**Current Status**: Phases 1-3 complete. MVP ready for E2E testing.

---

## Phase 1: Core Engine ✅ COMPLETE

**Goal**: Load a JSON game definition and run it with physics and rendering.

### Tasks

#### 1.1 Entity System ✅
- [x] Define TypeScript types for GameDefinition, Entity, Components - `shared/src/types/`
- [x] Implement EntityManager (create, destroy, query) - `app/lib/game-engine/EntityManager.ts`
- [x] Implement template system (resolve template references)
- [x] JSON serialization/deserialization

#### 1.2 Physics Integration ✅
- [x] Extend existing Box2D wrapper for entity-based creation
- [x] Create physics bodies from entity definitions
- [x] Sync entity transforms from physics bodies each frame
- [x] Handle entity destruction (remove physics bodies)

#### 1.3 Rendering Integration ✅
- [x] Create Skia components from entity sprite definitions - `app/lib/game-engine/renderers/`
- [x] Support basic shapes: rect, circle, polygon
- [x] Support image sprites (load from URL) - `ImageRenderer.tsx`
- [x] Apply transforms (position, rotation, scale)
- [x] Layer ordering (z-index)

#### 1.4 Game Loop ✅
- [x] Integrate EntityManager, PhysicsSystem, Renderer - `GameRuntime.native.tsx`
- [x] Fixed timestep physics with interpolated rendering
- [x] Frame timing and delta time handling

### Deliverable ✅
- Load a hardcoded JSON game definition
- See entities rendered with Skia
- Physics simulation runs (objects fall, collide)

---

## Phase 2: Game Framework ✅ COMPLETE

**Goal**: Complete game loop with behaviors, input, and win/lose conditions.

### Tasks

#### 2.1 Behavior System ✅
- [x] Define Behavior interface and registry - `BehaviorExecutor.ts`
- [x] Implement core behaviors:
  - [x] `move` (linear movement, patrol)
  - [x] `rotate` (continuous rotation)
  - [x] `oscillate` (back-and-forth)
  - [x] `spawn_on_event` (tap, timer, collision)
  - [x] `destroy_on_collision`
  - [x] `score_on_collision`
  - [x] `timer`
- [x] Behavior execution in game loop

#### 2.2 Control Behaviors ✅
- [x] `tap_to_jump`
- [x] `drag_to_aim` (slingshot mechanic)
- [x] `tilt_to_move` (accelerometer)
- [x] `buttons` (virtual button controls)

#### 2.3 Input System ✅
- [x] Touch event handling (tap, drag)
- [x] World coordinate conversion
- [x] Accelerometer/gyroscope integration
- [x] Input state accessible to behaviors

#### 2.4 Rules System ✅
- [x] Define Rule interface - `RulesEvaluator.ts`
- [x] Collision event routing to rules
- [x] Timer-based rules
- [x] Win/Lose condition evaluation
- [x] Score tracking

#### 2.5 Game UI ✅
- [x] Score display overlay
- [x] Timer display
- [x] Win screen
- [x] Lose screen
- [x] Pause/restart functionality

### Deliverable ✅
- Play a complete game from start to win/lose
- Score tracking works
- Multiple input methods (tap, drag, tilt)

---

## Phase 3: AI Integration ✅ COMPLETE

**Goal**: Generate playable games from natural language prompts.

### Tasks

#### 3.1 Backend API Setup ✅
- [x] Set up backend service (Cloudflare Workers + Hono + tRPC)
- [x] API endpoint: `games.generate` tRPC mutation
- [x] API endpoint: `games.refine` tRPC mutation
- [x] API endpoint: `assets.generate` tRPC mutation
- [x] Install-based auth (installId header)

#### 3.2 Game Generation ✅
- [x] System prompt engineering for game generation - `api/src/ai/generator.ts`
- [x] Intent extraction from user prompts - `api/src/ai/classifier.ts`
- [x] Game type classification
- [x] Template-based generation - `api/src/ai/templates.ts`
- [x] Output validation - `api/src/ai/validator.ts`
- [x] Self-correction on validation failure

#### 3.3 Asset Generation ✅
- [x] Integration with Scenario.com API - `api/src/ai/scenario.ts`
- [x] Sprite prompt engineering - `api/src/ai/assets.ts`
- [x] Style consistency across game (model matrix)
- [x] Background removal / transparency - `removeBackground()`
- [x] R2 storage for assets

#### 3.4 Refinement ✅
- [x] Modification prompt handling - `games.refine`
- [x] Partial game updates
- [x] Preserve user customizations

#### 3.5 Frontend Integration ✅
- [x] Prompt input UI - Create tab
- [x] Generation loading state
- [x] Error handling and suggestions
- [x] Asset loading and display

### Deliverable ✅
- Type a prompt, receive a playable game
- Generated sprites appear on entities (with fallback placeholders)
- Refine game with follow-up prompts

---

## Phase 4: User Studio

**Goal**: Visual tools for editing and tuning games.

### Tasks

#### 4.1 Game Editor
- [ ] Scene view (visual representation of game)
- [ ] Entity selection (tap to select)
- [ ] Entity manipulation (drag to move, handles to resize)
- [ ] Add/remove entities
- [ ] Duplicate entities

#### 4.2 Property Inspector
- [ ] Display selected entity properties
- [ ] Edit transform (position, rotation, scale)
- [ ] Edit sprite (color, size)
- [ ] Edit physics (density, friction, restitution)
- [ ] Sliders for numeric values

#### 4.3 Behavior Editor
- [ ] List behaviors on entity
- [ ] Add behavior from catalog
- [ ] Edit behavior parameters
- [ ] Remove behaviors
- [ ] Behavior presets

#### 4.4 Rules Editor
- [ ] Visual rule builder
- [ ] Win/lose condition picker
- [ ] Test rules in editor

#### 4.5 Asset Studio
- [ ] Browse generated assets
- [ ] Regenerate with different prompt
- [ ] Simple editing (color adjust, flip)
- [ ] Import from device photos

#### 4.6 Game Management
- [ ] Save games locally
- [ ] Load saved games
- [ ] Rename/delete games
- [ ] Export game definition (JSON)

### Deliverable
- Visually create and edit games
- Fine-tune physics and behaviors
- Manage game library

---

## Phase 5: Polish & Launch

**Goal**: Production-ready app for app stores.

### Tasks

#### 5.1 Performance
- [ ] Profile and optimize game loop
- [ ] Asset loading optimization
- [ ] Memory management audit
- [ ] Battery usage optimization

#### 5.2 UX Polish
- [ ] Onboarding flow
- [ ] Tutorial / example games
- [ ] Empty states
- [ ] Error messages
- [ ] Loading states
- [ ] Animations and transitions

#### 5.3 Audio
- [ ] Sound effect system
- [ ] Background music support
- [ ] Volume controls
- [ ] Sound for common actions (collect, destroy, win, lose)

#### 5.4 Platform-Specific
- [ ] iOS App Store requirements
- [ ] Android Play Store requirements
- [ ] App icons and screenshots
- [ ] Privacy policy
- [ ] Terms of service

#### 5.5 Analytics
- [ ] Usage tracking
- [ ] Crash reporting
- [ ] AI generation quality metrics
- [ ] User engagement metrics

#### 5.6 Testing
- [ ] Unit tests for core engine
- [ ] Integration tests for game loop
- [ ] E2E tests for critical flows
- [ ] Device testing matrix
- [ ] Beta testing program

### Deliverable
- App submitted to app stores
- Production monitoring in place
- Beta feedback incorporated

---

## Future Phases (Post-MVP)

### Phase 6: Sharing & Social
- [ ] Publish games to public gallery
- [ ] Browse and play others' games
- [ ] Like/favorite games
- [ ] Follow creators
- [ ] Share links to games

### Phase 7: Monetization
- [ ] In-app purchases
- [ ] Premium features
- [ ] Creator monetization (revenue share)
- [ ] Ads (optional, non-intrusive)

### Phase 8: Advanced Features
- [ ] Multiplayer support
- [ ] Level editor (multiple scenes)
- [ ] Custom behaviors (visual scripting)
- [ ] Sound designer
- [ ] More physics (soft bodies, fluids)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| AI generates invalid games | Validation layer, self-correction, fallback templates |
| Performance issues with many entities | Entity pooling, LOD, physics sleeping |
| Image generation costs | Caching, rate limits, fallback to shapes |
| Complex physics scenarios | Limit joint types in MVP, curated templates |
| App store rejection | Follow guidelines, review similar apps |

---

## Success Metrics

### Phase 1-2 (Engine)
- [ ] 60fps with 50+ dynamic entities
- [ ] Load game from JSON in < 100ms
- [ ] All test games playable

### Phase 3 (AI)
- [ ] >80% of prompts produce valid games
- [ ] Generation time < 10 seconds
- [ ] User can refine with 2-3 prompts

### Phase 4 (Studio)
- [ ] Edit any property in < 3 taps
- [ ] Users create games without AI (editor only)

### Phase 5 (Launch)
- [ ] Crash rate < 0.1%
- [ ] App store rating > 4.0
- [ ] Users create 3+ games in first session
