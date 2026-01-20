# MVP Roadmap

Development phases for the AI-Powered Mobile Game Maker.

---

## Phase Overview

| Phase | Focus | Duration | Outcome |
|-------|-------|----------|---------|
| **Phase 1** | Core Engine | 2-3 weeks | Game definitions run and play |
| **Phase 2** | Game Framework | 2-3 weeks | Complete games with win/lose |
| **Phase 3** | AI Integration | 2-3 weeks | Generate games from prompts |
| **Phase 4** | User Studio | 3-4 weeks | Visual editing and tuning |
| **Phase 5** | Polish & Launch | 2-3 weeks | App store ready |

**Total estimated time: 11-16 weeks**

---

## Phase 1: Core Engine

**Goal**: Load a JSON game definition and run it with physics and rendering.

### Tasks

#### 1.1 Entity System
- [ ] Define TypeScript types for GameDefinition, Entity, Components
- [ ] Implement EntityManager (create, destroy, query)
- [ ] Implement template system (resolve template references)
- [ ] JSON serialization/deserialization

#### 1.2 Physics Integration
- [ ] Extend existing Box2D wrapper for entity-based creation
- [ ] Create physics bodies from entity definitions
- [ ] Sync entity transforms from physics bodies each frame
- [ ] Handle entity destruction (remove physics bodies)

#### 1.3 Rendering Integration
- [ ] Create Skia components from entity sprite definitions
- [ ] Support basic shapes: rect, circle, polygon
- [ ] Support image sprites (load from URL)
- [ ] Apply transforms (position, rotation, scale)
- [ ] Layer ordering (z-index)

#### 1.4 Game Loop
- [ ] Integrate EntityManager, PhysicsSystem, Renderer
- [ ] Fixed timestep physics with interpolated rendering
- [ ] Frame timing and delta time handling

### Deliverable
- Load a hardcoded JSON game definition
- See entities rendered with Skia
- Physics simulation runs (objects fall, collide)

### Test Games
1. Falling boxes (existing demo, converted to JSON format)
2. Static platforms with bouncing ball

---

## Phase 2: Game Framework

**Goal**: Complete game loop with behaviors, input, and win/lose conditions.

### Tasks

#### 2.1 Behavior System
- [ ] Define Behavior interface and registry
- [ ] Implement core behaviors:
  - [ ] `move` (linear movement, patrol)
  - [ ] `rotate` (continuous rotation)
  - [ ] `oscillate` (back-and-forth)
  - [ ] `spawn_on_event` (tap, timer, collision)
  - [ ] `destroy_on_collision`
  - [ ] `score_on_collision`
  - [ ] `timer`
- [ ] Behavior execution in game loop

#### 2.2 Control Behaviors
- [ ] `tap_to_jump`
- [ ] `drag_to_aim` (slingshot mechanic)
- [ ] `tilt_to_move` (accelerometer)
- [ ] `tap_to_flip` (pinball flippers)

#### 2.3 Input System
- [ ] Touch event handling (tap, drag)
- [ ] World coordinate conversion
- [ ] Accelerometer/gyroscope integration
- [ ] Input state accessible to behaviors

#### 2.4 Rules System
- [ ] Define Rule interface
- [ ] Collision event routing to rules
- [ ] Timer-based rules
- [ ] Win/Lose condition evaluation
- [ ] Score tracking

#### 2.5 Game UI
- [ ] Score display overlay
- [ ] Timer display
- [ ] Win screen
- [ ] Lose screen
- [ ] Pause/restart functionality

### Deliverable
- Play a complete game from start to win/lose
- Score tracking works
- Multiple input methods (tap, drag, tilt)

### Test Games
1. Ball drop / Plinko (tap to spawn, score on bucket)
2. Angry Birds clone (drag to aim, destroy targets to win)
3. Simple platformer (tap to jump, reach goal)

---

## Phase 3: AI Integration

**Goal**: Generate playable games from natural language prompts.

### Tasks

#### 3.1 Backend API Setup
- [ ] Set up backend service (Node.js/Edge functions)
- [ ] API endpoint: POST /generate-game
- [ ] API endpoint: POST /refine-game
- [ ] API endpoint: POST /generate-asset
- [ ] Authentication/rate limiting

#### 3.2 Game Generation
- [ ] System prompt engineering for game generation
- [ ] Intent extraction from user prompts
- [ ] Game type classification
- [ ] Template-based generation
- [ ] Output validation
- [ ] Self-correction on validation failure

#### 3.3 Asset Generation
- [ ] Integration with image generation API
- [ ] Sprite prompt engineering
- [ ] Style consistency across game
- [ ] Background removal / transparency
- [ ] Asset caching

#### 3.4 Refinement
- [ ] Modification prompt handling
- [ ] Partial game updates
- [ ] Preserve user customizations

#### 3.5 Frontend Integration
- [ ] Prompt input UI
- [ ] Generation loading state
- [ ] Error handling and suggestions
- [ ] Asset loading and display

### Deliverable
- Type a prompt, receive a playable game
- Generated sprites appear on entities
- Refine game with follow-up prompts

### Test Prompts
1. "Make a game where I throw balls at targets"
2. "A platformer with a jumping cat"
3. "Plinko game with colored buckets"

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
