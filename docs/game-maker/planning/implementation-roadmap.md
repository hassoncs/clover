# Clover Game Maker - Implementation Roadmap

> **AI-Powered 2D Game Maker for Kids**
> Turn natural language into playable physics games in under 30 seconds.

**Target Audience**: Children ages 6-14 and casual creators  
**Tech Stack**: React Native (Expo) + Skia + Box2D (JSI/WASM) + tRPC + Cloudflare D1  
**Success Metric**: >80% of prompts produce playable games; <30 seconds to play

---

## Current Progress Summary

| Phase                       | Status            | Progress                                       |
| --------------------------- | ----------------- | ---------------------------------------------- |
| Phase 0: Infrastructure     | **90% Complete**  | D1 + API done, Auth needs E2E test             |
| Phase 1: Entity System      | **95% Complete**  | EntityManager, renderers, physics mapping done |
| Phase 2: Behavior System    | **95% Complete**  | All core behaviors implemented ✅              |
| Phase 3: Rules Engine       | **95% Complete**  | Rules, win/lose conditions done ✅             |
| Phase 4: Game Runtime       | **95% Complete**  | Runtime + CameraSystem + Pause done            |
| Phase 5: AI Generation      | **100% Complete** | All backend + API routes wired ✅              |
| Phase 6: Asset Generation   | **100% Complete** | Scenario client + tRPC routes wired ✅         |
| **Phase 6.5: Asset-Game UI**| **100% Complete** | All core UI done ✅                            |
| **Phase 7: Visual Editor**  | **75% Complete**  | Core editor UI done (Phases 1-6), social features pending |
| Phase 8: Sound & Polish     | Not Started       | 0% (Post-MVP)                                  |
| Phase 9: User Experience    | **85% Complete**  | MVP screens implemented                        |
| Phase 10: Launch Prep       | Not Started       | 0% (Post-MVP)                                  |
| Phase 11: Player Controls   | Not Started       | 0% (Post-MVP) - [Plan](./player-control-system.md) |
| Phase 12: Sound Generation  | Not Started       | 0% (MVP+1) - [Plan](./sound-generation-system.md) |
| Phase 13: Offline-First     | Not Started       | 0% (MVP+1) - [Plan](./offline-first-architecture.md) |
| **Phase 14: Viewport & Camera** | **85% Complete** | Core system done, polish pending - [Plan](../architecture/viewport-and-camera-system.md) |
| Phase 15: Tile System       | Not Started       | 0% (MVP+1) - [Plan](./tile-system.md) |
| **Phase 16: ComfyUI Migration** | **In Progress** | Migrate from Scenario.com to self-hosted - [Plan](../../plans/scenario-to-comfyui-migration.md) |

### MVP Status: VISUAL EDITOR CORE COMPLETE - READY FOR TESTING

**Last Updated**: 2026-01-22 (Viewport & Camera System 85% complete)

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
- [ ] Add redirect URL: `slopcade://auth/callback` (native)
- [ ] Add redirect URL: `http://localhost:8085/auth/callback` (dev)
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
- [ ] Enhanced Player Controls (POST-MVP) - See [player-control-system.md](./player-control-system.md)
  - [ ] Keyboard controls (WASD/Arrows) for web
  - [ ] Virtual DPad + action buttons for mobile
  - [ ] Configurable tap zones
  - [ ] Cross-platform input abstraction

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

### Phase 6: Asset Generation Backend [100% COMPLETE] ✅

- [x] Scenario.com integration (pixel art, backgrounds, UI) - `api/src/ai/scenario.ts`
- [x] Style consistency across assets (model matrix per entity type) - `api/src/ai/assets.ts`
- [x] R2 storage for generated assets - `AssetService.uploadToR2()`
- [x] Placeholder system with async replacement - `createPlaceholderResult()`
- [x] Wire up `assets.generate` tRPC mutation - `api/src/trpc/routes/assets.ts:44`
- [x] Wire up `assets.generateBatch` tRPC mutation - `api/src/trpc/routes/assets.ts:125`
- [x] Wire up `assets.list` and `assets.get` - `api/src/trpc/routes/assets.ts:182,228`
- [x] Wire up `assets.generateForGame` tRPC mutation - `api/src/trpc/routes/assets.ts:271`
- [ ] Integration with game generation pipeline (auto-generate assets during game gen) - POST-MVP

---

### Phase 6.5: Asset-Game UI Integration [100% COMPLETE] ✅

**Goal**: Connect generated graphics to physics games with full UI controls

#### 6.5.1 Schema & Data Model [100% COMPLETE] ✅
- [x] `AssetPackSchema` with id, name, description, style, assets - `api/src/ai/schemas.ts:464`
- [x] `AssetConfigSchema` with imageUrl, source, scale, offsetX, offsetY - `api/src/ai/schemas.ts:449`
- [x] `ParallaxConfigSchema` with layers (sky, far, mid, near) - `api/src/ai/schemas.ts:486`
- [x] Game definition supports `assetPacks` and `activeAssetPackId` - `api/src/ai/schemas.ts:501-502`

#### 6.5.2 Rendering Pipeline [100% COMPLETE] ✅
- [x] `EntityRenderer` accepts `assetOverrides` prop - `app/lib/game-engine/renderers/EntityRenderer.tsx:13`
- [x] `getAssetOverrideSprite()` creates ImageSprite from AssetConfig - `EntityRenderer.tsx:61`
- [x] `ImageRenderer` renders with Skia useImage, tint, opacity, offset - `app/lib/game-engine/renderers/ImageRenderer.tsx`
- [x] `GameRuntime` computes assetOverrides from activeAssetPackId - `GameRuntime.native.tsx:87-91`
- [x] `ParallaxBackground` component with camera-based parallax - `app/lib/game-engine/renderers/ParallaxBackground.tsx`

#### 6.5.3 Basic UI [100% COMPLETE] ✅
- [x] "🎨 Skin" button on play screen - `app/app/play/[id].tsx:151-158`
- [x] Asset generation modal with theme prompt input - `app/app/play/[id].tsx:163-221`
- [x] "Generate New" button calls `generateForGame` - `app/app/play/[id].tsx:81-109`
- [x] Asset pack selection (switch between existing packs) - `app/app/play/[id].tsx:182-196`
- [x] Style selection dropdown (pixel/cartoon/3d/flat) - `app/app/play/[id].tsx:355-364`
- [x] Generation progress indicators (ActivityIndicator components)

#### 6.5.4 Advanced UI [100% COMPLETE] ✅
- [x] Per-entity asset editing panel (view individual assets) - `app/components/assets/EntityAssetList.tsx`
- [x] Regenerate specific asset in pack - wired to `regenerateTemplateAsset`
- [x] Delete/manage asset packs - `deletePack` endpoint + UI button
- [x] Parallax background generation UI - `app/components/assets/ParallaxAssetPanel.tsx`
- [x] Layer management (generate/visibility toggle per layer)

**Future Enhancements (Post-MVP)**:
- Asset preview before applying to game
- Asset offset/scale adjustment controls

#### 6.5.5 API Routes [100% COMPLETE] ✅
- [x] `assets.generateForGame` - generate assets for all templates
- [x] `assets.regenerateTemplateAsset` - regenerate single asset in pack
- [x] `assets.setTemplateAsset` - set/clear asset for template
- [x] `assets.deletePack` - remove asset pack from game - `api/src/trpc/routes/assets.ts`
- [x] `assets.generateBackgroundLayer` - generate parallax layer
- [x] `assets.updateParallaxConfig` - update parallax settings

#### 6.5.6 Testing & Verification [HUMAN TASKS]
- [ ] Manual E2E test: generate assets for sample game (requires API keys)
- [ ] Verify ImageRenderer loads R2 URLs correctly
- [ ] Verify parallax renders with generated images
- [ ] Test asset pack switching works correctly
- [ ] Test on web, iOS simulator, Android emulator

---

### Phase 7: Visual Game Editor [75% COMPLETE] 🔄

> **Full Plan**: [editor-redesign/INDEX.md](./editor-redesign/INDEX.md)
> **Detailed Progress**: [editor-redesign/PROGRESS.md](./editor-redesign/PROGRESS.md)

The mobile-first editor redesign is substantially complete (Phases 1-6 of 8).

#### 7.1 Foundation & Layout ✅ COMPLETE
- [x] EditorProvider with context (mode, selection, undo/redo state)
- [x] EditorTopBar (back, undo/redo, title, mode toggle)
- [x] BottomDock (5-button navigation)
- [x] StageContainer wrapping GameRuntime
- [x] New editor route `app/app/editor/[id].tsx`

#### 7.2 Canvas Interaction ✅ COMPLETE
- [x] Tap to select entities
- [x] Drag to move selected
- [x] Pinch to scale selected
- [x] Two-finger pan/zoom for camera
- [x] SelectionOverlay with Skia bounding box

#### 7.3 Bottom Sheet & Panels ✅ COMPLETE
- [x] @gorhom/bottom-sheet with snap points (12%, 50%, 90%)
- [x] Tab navigation (Assets, Properties, Layers, Debug)
- [x] LayersPanel (entity list with selection)
- [x] PropertiesPanel (transform, physics, color)
- [x] AssetsPanel (search, categories, tap-to-add)
- [x] DebugPanel (debug toggles)

#### 7.4 Asset Library & AI ✅ COMPLETE
- [x] Game asset browser
- [x] Basic shapes (box, circle, triangle)
- [x] Tap-to-add functionality
- [x] AIGenerateModal (placeholder - needs real API integration)

#### 7.5 Properties & Editing ✅ COMPLETE
- [x] Full transform controls (X, Y, Scale, Rotation)
- [x] Physics properties (bodyType, density, friction, restitution)
- [x] Color picker with presets
- [x] Delete/duplicate buttons
- [x] updateEntityProperty for arbitrary property changes

#### 7.6 History (Undo/Redo) ✅ COMPLETE
- [x] Document snapshot history
- [x] Undo/redo with full state restoration
- [x] All operations tracked in history
- [x] Max 50 history entries

#### 7.7 Social Features ⏳ PENDING
- [ ] games.fork tRPC endpoint
- [ ] games.share endpoints  
- [ ] assetPacks.list/apply endpoints
- [ ] Fork UI
- [ ] Share UI with link/QR
- [ ] Asset pack browser

#### 7.8 Polish & Migration ⏳ PENDING
- [ ] Navigation update (link to new editor)
- [ ] Remove deprecated code
- [ ] Performance optimization
- [ ] Cross-platform testing

---

### Phase 8: Sound & Polish [0% COMPLETE]

- [ ] Haptic feedback
- [ ] Particle effects
- [ ] Performance optimization

> **Note**: Sound generation now planned as separate Phase 12 (see below)

---

### Phase 11: Enhanced Player Controls [0% COMPLETE] - POST-MVP

> **Full Plan**: [player-control-system.md](./player-control-system.md)

**Goal**: Unified cross-platform input system with keyboard, virtual controls, and tap zones.

- [ ] InputManager infrastructure (adapter pattern)
- [ ] Keyboard controls for web (WASD/Arrows)
- [ ] Virtual DPad + action buttons for mobile
- [ ] Configurable tap zones (left/right/custom)
- [ ] AI prompt updates for new control types
- [ ] Documentation

**Why Post-MVP**: Current `buttons` control type works; this enhances UX for specific game types.

---

### Phase 12: Sound Generation System [0% COMPLETE] - MVP+1

> **Full Plan**: [sound-generation-system.md](./sound-generation-system.md)

**Goal**: AI-generated sound effects and background music with reliable playback, caching, and asset storage.

**Key Components**:
- [ ] AudioManager + expo-av integration
- [ ] Bundled sound library (pre-made SFX pack for MVP)
- [ ] AI SFX generation (ElevenLabs API)
- [ ] Background music support (Mubert or bundled tracks)
- [ ] tRPC sound generation routes (`sounds.generate`, `sounds.list`)
- [ ] R2 storage for generated audio files
- [ ] AudioPlayer behaviors (`play_sound`, `play_music`, `stop_sound`)
- [ ] Rule action integration (`action: 'sound'`)
- [ ] AI prompt updates for sound descriptions

**Why MVP+1**: Sound significantly enhances user experience but isn't blocking for core gameplay. Bundled sounds can ship quickly (Phase 1-2 = 1 week), AI generation adds customization (Phase 3-4 = 1-2 weeks).

**Dependencies**: 
- expo-av package
- ElevenLabs API key (for AI generation)
- Mubert API key (optional, for background music)
- R2 bucket for audio files (already exists)

**Estimated Timeline**: 2-3 weeks
- Phase 1-2 (AudioManager + bundled sounds): 1 week
- Phase 3-4 (AI generation + music): 1-2 weeks
- Phase 5 (Polish): 3-5 days

**Implementation Strategy**:
1. **Quick Win**: Ship bundled sound pack first (immediate value, no API costs)
2. **Premium Feature**: AI sound generation as enhancement (opt-in, user-triggered)
3. **Hybrid Approach**: Use bundled sounds as fallback if AI generation fails

---

### Phase 14: Viewport & Camera System [85% COMPLETE] - MVP+1

> **Full Plan**: [../architecture/viewport-and-camera-system.md](../architecture/viewport-and-camera-system.md)

**Goal**: Fixed aspect ratio viewport with letterboxing and comprehensive camera system for consistent cross-platform gameplay.

**Problem**: Currently, different screen sizes show different amounts of the game world, making physics feel inconsistent across devices. Games need a fixed "design viewport" that scales uniformly.

#### 14.1 Viewport System [COMPLETE] ✅
- [x] `ViewportSystem` class - computes viewport rect from screen size
- [x] `ViewportContext` - React context for viewport info
- [x] Letterboxing layout (View-based, not Canvas clipping)
- [x] Input coordinate transformation through viewport
- [x] `presentation` schema block (aspectRatio, fit, letterboxColor, orientation)
- [x] Exports from game-engine index

**Key Files**:
- `app/lib/game-engine/ViewportSystem.ts` - Core viewport calculations
- `app/lib/game-engine/ViewportContext.tsx` - React context provider
- `app/lib/game-engine/GameRuntime.native.tsx` - Letterboxing layout integration
- `app/lib/game-engine/hooks/useGameInput.ts` - Viewport-aware input handling

#### 14.2 Camera System Enhancement [90% COMPLETE] ✅
- [x] Camera types: `fixed`, `follow`, `follow-x`, `follow-y`, `auto-scroll`
- [x] Dead zones (camera-window behavior)
- [x] Look-ahead (velocity-based offset)
- [x] Auto-scroll with acceleration
- [x] Camera shake (trauma-based system)
- [x] Bounds clamping
- [x] Factory method `CameraSystem.fromGameConfig()`
- [ ] `manual` camera type (pan/zoom with inertia) - POST-MVP
- [ ] `region` camera type (per-area configs) - POST-MVP

**Key Files**:
- `app/lib/game-engine/CameraSystem.ts` - Full camera implementation
- `shared/src/types/schemas.ts` - Enhanced CameraConfigSchema
- `api/src/ai/schemas.ts` - API schema sync

#### 14.3 Schema Updates [COMPLETE] ✅
- [x] `PresentationConfigSchema` in shared types
- [x] `PresentationConfigSchema` in API schemas
- [x] Enhanced `CameraConfigSchema` with all new features
- [x] Backward compatible (existing games work without changes)

#### 14.4 Polish & Integration [PENDING]
- [ ] Platform snapping for platformer cameras
- [ ] Camera transitions (smooth config changes)
- [ ] AI prompt updates for camera configuration
- [ ] Test games for each camera type
- [ ] Documentation updates

**Camera Types by Game**:
| Game Type | Camera | Status |
|-----------|--------|--------|
| Puzzle | `fixed` | ✅ Done |
| Platformer | `follow` | ✅ Done (dead zone, look-ahead) |
| Side-scroller | `follow-x` | ✅ Done |
| Vertical climber | `follow-y` | ✅ Done |
| Endless Runner | `auto-scroll` | ✅ Done |
| Sandbox | `manual` | ❌ Not started |
| Metroidvania | `region` | ❌ Not started |

**Remaining Work** (estimated 4-6 hours):
- Platform snapping: 2h
- AI prompt updates: 2h
- Test games: 2h

---

### Phase 15: Tile System [0% COMPLETE] - MVP+1

> **Full Plan**: [tile-system.md](./tile-system.md)

**Goal**: Efficient grid-based rendering for backgrounds, platforms, and game worlds using tile sheets and tile maps.

**Problem**: Currently, all visual elements are rendered as individual sprites, which is inefficient for grid-based content like platformer levels, top-down maps, and repeating backgrounds. The AI already generates "tileable" assets, but there's no system to leverage them efficiently.

**Key Components**:
- [ ] TileSheet asset type (sprite grids with metadata)
- [ ] TileMap definition (layers, collision, parallax)
- [ ] TileMapRenderer using Skia's `Atlas` for batch rendering
- [ ] Tile map editor UI (paint tool, layer management)
- [ ] Collision body generation from tile data
- [ ] AI tile sheet generation (extend Scenario.com integration)
- [ ] AI tile map generation from prompts
- [ ] tRPC routes (`tiles.generateSheet`, `tiles.generateMap`, `tiles.updateTile`)

**Why MVP+1**: Unlocks platformers and top-down games with efficient rendering. Current individual sprite approach works but doesn't scale well for large grid-based levels.

**Benefits**:
- 🚀 Render 1000+ tiles in a single draw call with `Atlas`
- 🎮 Unlock platformer, top-down, and puzzle game types
- 🤖 Leverage existing tileable asset generation
- ✂️ One sprite sheet vs. hundreds of individual images

**Dependencies**:
- `@shopify/react-native-skia` Atlas component (already available)
- Scenario.com tile generation model (already using `model_retrodiffusion-tile`)
- R2 bucket for tile sheet images (already exists)

**Estimated Timeline**: 1-2 weeks
- Phase 1 (Asset Types & Schema): 1-2 days
- Phase 2 (Rendering): 2-3 days
- Phase 3 (Editor): 3-4 days
- Phase 4 (AI Integration): 2-3 days
- Phase 5 (Polish & Testing): 1-2 days

**Implementation Strategy**:
1. **Asset Types First**: Add TileSheet and TileMap types to GameDefinition schema
2. **Rendering**: Implement TileMapRenderer with Atlas for batch rendering
3. **Simple Editor**: Paint-style interface with layer management
4. **AI Last**: Extend asset generation to create tile sheets and maps from prompts

---

### Phase 13: Offline-First Architecture [0% COMPLETE] - MVP+1

> **Full Plan**: [offline-first-architecture.md](./offline-first-architecture.md)

**Goal**: All games playable offline as a key product differentiator.

**Key Components**:
- [ ] SQLite database for game definitions (`expo-sqlite`)
- [ ] Content-addressed asset storage (`documentDirectory/assets/<hash>.<ext>`)
- [ ] AssetManager service (download, cache, resolve URLs)
- [ ] `useCachedImage` hook for ImageRenderer integration
- [ ] Asset manifest in GameDefinition
- [ ] "Download for Offline" UI with progress
- [ ] Storage management (usage display, clear cache)
- [ ] Garbage collection for orphaned assets

**Why MVP+1**: Key differentiator - users expect games to work offline. Current implementation requires network for every image load.

**Dependencies**:
- expo-file-system (already in Expo)
- expo-sqlite (already in Expo)
- API update to generate asset manifests

**Estimated Timeline**: 1-2 days
- Phase 1-2 (Database + AssetManager): 4-6 hours
- Phase 3 (Hook integration): 2-3 hours
- Phase 4-5 (API + UI): 4-6 hours
- Phase 6 (Testing): 2-3 hours

**Implementation Strategy**:
1. **Database first**: Set up SQLite schema and migrations
2. **Asset pipeline**: Build download/cache/resolve flow
3. **Hook integration**: Minimal changes to existing renderers
4. **UI last**: Add download buttons and progress indicators

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

| Metric                  | Target      | Current                  |
| ----------------------- | ----------- | ------------------------ |
| Generation Success Rate | >80%        | N/A (AI not implemented) |
| Time to Play            | <30 seconds | N/A                      |
| Frame Rate              | 60fps       | Untested at scale        |
| Crash Rate              | <0.1%       | N/A                      |
| API Test Coverage       | 100%        | 4/4 passing              |

---

_Last Updated: January 2026_
