# Slopcade Game Engine: Top 50 Mobile Games Feasibility Report

**Internal Engineering Analysis** | January 2026

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Scoring Rubric](#scoring-rubric)
3. ["Inspired-By" Framing](#inspired-by-framing)
4. [Engine Capabilities Summary (Verified)](#engine-capabilities-summary-verified)
5. [50-Game Analysis Summary](#50-game-analysis-summary)
6. [Detailed Per-Game Analysis](#detailed-per-game-analysis)
7. [Tier Recommendations](#tier-recommendations)
8. [Top 10 Recommendations](#top-10-recommendations)
9. [Gap Analysis](#gap-analysis)
10. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

The Slopcade game engine is a 2D physics-based system built on Godot 4, targeting simple-to-medium complexity mobile games. This report analyzes 50 popular mobile games against our current capabilities to identify which games we can build now, which require engine improvements, and which are outside our scope.

**Key Findings:**

- **15 games (30%)** are immediately feasible with existing engine systems (Tier 1)
- **18 games (36%)** require minor additions and represent our near-term opportunity (Tier 2)
- **12 games (24%)** need significant engine work or have fundamental incompatibilities (Tier 3)
- **5 games (10%)** are not recommended due to 3D requirements, complex narrative systems, or device-specific inputs (Tier 4)

Our engine excels at: physics-based puzzles, grid-based matching games, sorting puzzles, and simple arcade mechanics. We have built-in systems for Match-3 (Gem Crush), tube sorting (Ball Sort), and projectile physics (Slopeggle).

**Critical Gaps:** Virtual on-screen controls (blocking mobile platformers), path drawing (blocking draw-physics games), and grid-based path validation (blocking path-finding puzzles). Addressing these three gaps would unlock 12 additional games from the list.

---

## Scoring Rubric

### Feasibility Ratings

| Rating | Description | Time Estimate |
|--------|-------------|---------------|
| ✅ **Easy** | Core mechanic maps directly to existing engine systems. Uses built-in templates (Match3, Ball Sort) or simple physics patterns. No new systems needed. | 1-3 days |
| ⚠️ **Medium** | Requires minor engine additions (new pattern, rule type, or input adaptation). Core mechanic achievable with workarounds. | 4-14 days |
| ❌ **Hard** | Requires significant new systems, 3D rendering, complex AI, narrative engines, or device-only inputs (tilt/accelerometer). | 15+ days or not recommended |

### Time Estimate Bands (Solo Engineer-Days)

| Band | Scope | Examples |
|------|-------|----------|
| 1-3 days | Asset swaps on existing templates, simple physics toys | New Match-3 theme, new Ball Sort variant |
| 4-7 days | Minor logic additions, new rule types, simple pattern implementations | Grid slide games, basic sorting puzzles |
| 8-14 days | New pattern implementation, moderate systems, input adaptations | Path-drawing games, complex physics puzzles |
| 15-28 days | Major systems, complex game logic, AI behaviors | Simulation games, procedural content |
| 29+ days | Not recommended - requires fundamental engine changes | 3D games, narrative adventures |

### Engine Fit Dimensions (1-5 Scale)

For each game, we rate:

1. **Input Fit**: Does the required input method exist and work on target platforms?
   - 5: Perfect fit (tap/drag/keyboard available)
   - 3: Workaround possible (e.g., use drag instead of tilt)
   - 1: No viable input method

2. **Physics Fit**: Do Godot physics primitives support the mechanic?
   - 5: Direct support (bodies, joints, sensors sufficient)
   - 3: Partial support (needs creative use of primitives)
   - 1: Requires unsupported physics (3D, fluid, soft-body)

3. **Rendering Fit**: Can we render what's needed with Skia/Godot 2D?
   - 5: Simple sprites/shapes sufficient
   - 3: Needs particles, effects, or multiple layers
   - 1: Requires 3D, complex shaders, or video

4. **System Fit**: Does a built-in game system exist?
   - 5: Built-in system (Match3, Ball Sort, Tetris)
   - 3: Pattern exists but needs implementation
   - 1: No relevant system or pattern

5. **AI Asset Fit**: Can Scenario.com generate appropriate sprites?
   - 5: Simple objects (balls, gems, blocks)
   - 3: Characters with specific poses
   - 1: Complex animations or specific art styles

### Market Appeal Heuristic (1-5 Scale)

Based on casual mobile game success factors:

- **Simplicity** (1-5): How easy is the core mechanic to understand in <30 seconds?
- **Visual Appeal** (1-5): How well do AI-generated assets showcase the game?
- **Viral Potential** (1-5): Shareability, satisfying moments, "just one more try" factor
- **Session Length** (1-5): 2-5 minute sessions score highest (mobile-optimized)
- **Demographic Breadth** (1-5): Appeals to broad age/skill ranges

**Total Score**: /25 - Games scoring 18+ are strong candidates

---

## "Inspired-By" Framing

This report evaluates creating **Slopcade versions** of popular games, not faithful clones. Key principles:

### What's Allowed
- **Core mechanic translation**: Adapt the essential gameplay loop to our engine capabilities
- **Asset/theme changes**: Use AI-generated art in any style (not copying original aesthetics)
- **Simplification**: Reduce complex mechanics to their essence (e.g., 2D instead of 3D)
- **Control adaptation**: Map to available inputs (e.g., drag instead of tilt)

### What's NOT Required
- Exact visual replication
- All original features and modes
- Licensed characters or themes
- Multiplayer or social features
- Complex narrative or cutscenes

### Example Translations
| Original | Slopcade Version |
|----------|------------------|
| Monument Valley (3D isometric) | 2D spatial puzzle with layered planes |
| Angry Birds (slingshot) | Physics projectile with drag-to-aim |
| Cut the Rope (rope cutting) | Chain physics with tap-to-break joints |
| Mini Metro (line drawing) | Grid-based path connection puzzle |

---

## Engine Capabilities Summary (Verified)

Based on repository documentation and working test games.

### Rendering Capabilities ✅

| Feature | Status | Evidence |
|---------|--------|----------|
| Static sprites | ✅ Implemented | `technical-primitives.md` |
| Animated sprites (frame-based) | ✅ Implemented | `technical-primitives.md` |
| Atlas batching | ✅ Implemented | Gem Crush uses atlas |
| Particle systems | ✅ Implemented | `technical-primitives.md` |
| Backgrounds (solid/tiled/parallax) | ✅ Implemented | `technical-primitives.md` |
| Text/UI overlays | ✅ Implemented | Score displays in test games |
| Conditional visual effects | ✅ Implemented | Hover, select, match effects |
| 3D rendering | ❌ Not available | Engine is 2D only |

### Physics Capabilities ✅

| Feature | Status | Evidence |
|---------|--------|----------|
| Static bodies | ✅ Implemented | `game-types.md` |
| Kinematic bodies | ✅ Implemented | Match3 pieces use kinematic |
| Dynamic bodies | ✅ Implemented | All physics games |
| Box/circle shapes | ✅ Implemented | `technical-primitives.md` |
| Polygon shapes | ✅ Implemented | `technical-primitives.md` |
| Revolute joints (hinges) | ✅ Implemented | Pinball flippers |
| Distance joints (ropes) | ✅ Implemented | `game-types.md` |
| Sensors (triggers) | ✅ Implemented | `technical-primitives.md` |
| Physics materials | ✅ Implemented | friction, bounce, density |

### Input Methods ✅

| Input | Status | Platform | Evidence |
|-------|--------|----------|----------|
| Tap | ✅ Implemented | All | `input-methods-catalog.md` |
| Drag (aim/move) | ✅ Implemented | All | `input-methods-catalog.md` |
| Draggable entities | ✅ Implemented | All | `input-methods-catalog.md` |
| Keyboard (WASD/arrows) | ✅ Implemented | Web only | `input-methods-catalog.md` |
| Virtual on-screen controls | ❌ Planned | Native | `input-methods-catalog.md` |
| Tap zones | ❌ Planned | All | `input-methods-catalog.md` |
| Tilt/accelerometer | ❌ Type only | Native | Types exist, not wired |

### Built-in Game Systems ✅

| System | Status | Test Game | Evidence |
|--------|--------|-----------|----------|
| Match-3 | ✅ Complete | Gem Crush | `tier-1-templates.md` |
| Ball Sort | ✅ Complete | Ball Sort | Working game |
| Tetris | ✅ Complete | None shown | `tier-1-templates.md` |
| Physics projectile | ✅ Complete | Slopeggle | Working game |
| State machines | ✅ Complete | Ball Sort | `game-patterns.md` |
| Rule system | ✅ Complete | All games | `game-rules.md` |
| Persistence | ✅ Complete | Ball Sort | `ballSort/game.ts` |

### Game Patterns ✅

All patterns from `game-patterns.md` are implemented:
- Choice System
- Pick & Place
- Column Drop
- Grid Slide
- Physics Drop
- Chain Reaction
- Balance/Threshold

---

## 50-Game Analysis Summary

| # | Game | Category | Feasibility | Days | Key Challenge |
|---|------|----------|-------------|------|---------------|
| 1 | Monument Valley | Spatial Puzzle | ⚠️ | 8-12 | 2D layering instead of 3D isometric |
| 2 | Monument Valley 2 | Spatial Puzzle | ⚠️ | 8-12 | Same as MV1 |
| 3 | Baba Is You | Rule-Based Logic | ❌ | 20+ | Rule manipulation system too complex |
| 4 | The Room | Mechanical Puzzle | ❌ | 25+ | 3D object manipulation required |
| 5 | The Room Two | Mechanical Puzzle | ❌ | 25+ | Same as The Room |
| 6 | The Room Three | Mechanical Puzzle | ❌ | 25+ | Same as The Room |
| 7 | Blackbox | Meta Puzzle | ❌ | 30+ | Device sensors, camera, microphone needed |
| 8 | Mini Metro | Systems/Optimization | ⚠️ | 10-14 | Path drawing and validation system |
| 9 | Mini Motorways | Systems/Optimization | ⚠️ | 10-14 | Same as Mini Metro |
| 10 | Threes! | Number/Merge | ✅ | 3-5 | Grid slide + merge pattern |
| 11 | 2048 | Number/Merge | ✅ | 2-3 | Grid slide pattern exists |
| 12 | Flow Free | Path/Grid | ⚠️ | 6-10 | Grid path validation system |
| 13 | Two Dots | Match Puzzle | ✅ | 2-3 | Match-3 variant |
| 14 | Dots | Match Puzzle | ✅ | 2-3 | Simple connection game |
| 15 | Kami | Color-Fill Logic | ⚠️ | 7-10 | Flood-fill algorithm + region detection |
| 16 | Kami 2 | Color-Fill Logic | ⚠️ | 7-10 | Same as Kami |
| 17 | A Little to the Left | Organizational | ⚠️ | 8-12 | Free-form placement validation |
| 18 | Lara Croft GO | Turn-Based Puzzle | ⚠️ | 10-14 | Grid movement + turn system |
| 19 | Hitman GO | Turn-Based Puzzle | ⚠️ | 10-14 | Same as Lara Croft GO |
| 20 | Prune | Physics/Growth | ⚠️ | 8-12 | Growth simulation + pruning mechanic |
| 21 | Cut the Rope | Physics Puzzle | ✅ | 4-6 | Rope joints + tap-to-cut |
| 22 | Where's My Water? | Physics Puzzle | ⚠️ | 10-14 | Fluid simulation (not in engine) |
| 23 | World of Goo | Physics/Construction | ❌ | 20+ | Complex structure building + goo physics |
| 24 | Contre Jour | Physics/Light | ⚠️ | 12-16 | Tentacle physics + light mechanics |
| 25 | Tomb of the Mask | Arcade Puzzle | ✅ | 3-5 | Grid slide + obstacles |
| 26 | Brain It On! | Draw-Physics | ❌ | 25+ | Free-form drawing system required |
| 27 | Angry Birds | Physics/Destruction | ✅ | 3-5 | Physics projectile exists (Slopeggle) |
| 28 | Tiny Tower | Management Sim | ❌ | 25+ | Complex simulation + time systems |
| 29 | Pocket Planes | Logistics Sim | ❌ | 20+ | Route planning + resource management |
| 30 | Pocket Trains | Logistics Sim | ❌ | 20+ | Same as Pocket Planes |
| 31 | Fallout Shelter | Shelter Sim | ❌ | 25+ | Complex management + character AI |
| 32 | Mini Cities | City Sim | ❌ | 18+ | City building + simulation systems |
| 33 | Game Dev Tycoon | Tycoon Sim | ❌ | 20+ | Complex progression + simulation |
| 34 | Universal Paperclips | Incremental | ✅ | 4-6 | Number manipulation + simple UI |
| 35 | Idle Miner Tycoon | Idle/Management | ❌ | 15+ | Idle progression + complex UI |
| 36 | Water Sort Puzzle | Sorting Puzzle | ✅ | 2-3 | Ball Sort system exists |
| 37 | Goods Sort | Sorting Puzzle | ✅ | 2-3 | Ball Sort variant |
| 38 | Triple Town | Merge Puzzle | ✅ | 4-6 | Grid slide + merge pattern |
| 39 | Merge Dragons! | Merge/Collection | ⚠️ | 10-14 | Merge chain + camp management |
| 40 | Unpacking | Organization | ⚠️ | 8-12 | Free-form placement + validation |
| 41 | Crossy Road | Endless Arcade | ⚠️ | 6-10 | Needs virtual controls or tap zones |
| 42 | Wordscapes | Word Puzzle | ✅ | 3-5 | Grid + word validation |
| 43 | SpellTower | Word/Grid | ✅ | 4-6 | Grid + word search |
| 44 | Ridiculous Fishing | Arcade/Physics | ⚠️ | 8-12 | Multi-phase gameplay + upgrades |
| 45 | Desert Golfing | Skill Puzzle | ✅ | 3-5 | Simple physics + endless loop |
| 46 | Florence | Narrative Puzzle | ❌ | 20+ | Narrative systems + mini-games |
| 47 | Gorogoa | Illustrated Puzzle | ❌ | 25+ | Image manipulation + complex logic |
| 48 | Old Man's Journey | Landscape Puzzle | ❌ | 18+ | Hand-drawn art + narrative |
| 49 | Device 6 | Textual/Spatial | ❌ | 25+ | Text manipulation + spatial audio |
| 50 | Hook | Minimalist Logic | ✅ | 3-5 | Chain reaction + line untangling |

---

## Detailed Per-Game Analysis

### PUZZLE / LOGIC GAMES (1-20)

#### 1. Monument Valley — Spatial / Visual Puzzle

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ⚠️ Medium |
| **Time Estimate** | 8-12 days |
| **Engine Fit** | Input: 5/5, Physics: 3/5, Rendering: 4/5, System: 2/5, AI Asset: 4/5 |
| **Market Appeal** | 22/25 (Visual: 5, Viral: 5, Simple: 4, Session: 4, Demographic: 4) |

**Key Challenges:**
- Original uses 3D isometric perspective with impossible geometry
- Slopcade version would use 2D layered planes with parallax
- Need custom "perspective shift" mechanic (tap to rotate view)
- Path validation on non-standard grid

**Engine Features Used:**
- Grid-based movement pattern
- State machines for perspective shifts
- Parallax backgrounds
- Conditional behaviors for visual feedback

**Missing Features to Build:**
- Isometric-to-2D translation system
- Path validation on rotated grids
- Perspective transition animations

**Slopcade Version:** "2D spatial puzzle where players tap to rotate layered planes and guide a character through impossible architecture."

---

#### 2. Monument Valley 2 — Spatial / Visual Puzzle

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ⚠️ Medium |
| **Time Estimate** | 8-12 days |

Same analysis as Monument Valley. Added mother-child dual character mechanic requires:
- Simple AI follower behavior (child follows path)
- Coordinate switching between characters

**Slopcade Version:** "Same as MV1 with added simple follower character that mirrors parent movements."

---

#### 3. Baba Is You — Rule-Based Logic

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ❌ Hard |
| **Time Estimate** | 20+ days |
| **Engine Fit** | Input: 5/5, Physics: 2/5, Rendering: 5/5, System: 1/5, AI Asset: 5/5 |

**Key Challenges:**
- Core mechanic IS manipulating game rules as game objects
- Requires dynamic rule parsing and application
- Rules affect physics, win conditions, entity properties
- Essentially a programming puzzle with visual feedback

**Missing Features:**
- Dynamic rule system (massive undertaking)
- Rule-to-mechanic translation layer
- Complex state dependency tracking

**Recommendation:** Not recommended. Core mechanic requires a rule-manipulation engine far beyond our scope.

---

#### 4-6. The Room Series — Mechanical Puzzle

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ❌ Hard |
| **Time Estimate** | 25+ days each |

**Key Challenges:**
- 3D object manipulation (rotate, zoom, examine)
- Complex mechanical interactions (keys, locks, gears)
- Detailed 3D assets required
- Inspection mechanic requires 3D camera control

**Missing Features:**
- 3D rendering (fundamental engine limitation)
- 3D interaction system
- Complex mechanical simulation

**Recommendation:** Not recommended. Requires 3D engine.

---

#### 7. Blackbox — Meta / Device-Based Puzzle

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ❌ Hard |
| **Time Estimate** | 30+ days |

**Key Challenges:**
- Puzzles use device sensors: accelerometer, gyroscope, camera, microphone
- Some puzzles require physical manipulation of device
- Meta-puzzles break fourth wall
- Each puzzle is essentially a unique mini-game

**Missing Features:**
- Accelerometer/gyroscope input (planned but not implemented)
- Camera access integration
- Microphone input
- Wide variety of unique mechanics

**Recommendation:** Not recommended. Requires device sensors and dozens of unique mechanics.

---

#### 8-9. Mini Metro / Mini Motorways — Systems / Optimization

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ⚠️ Medium |
| **Time Estimate** | 10-14 days each |
| **Engine Fit** | Input: 4/5, Physics: 3/5, Rendering: 4/5, System: 3/5, AI Asset: 5/5 |

**Key Challenges:**
- Free-form line drawing between nodes
- Path validation (lines can't cross, must connect stations)
- Dynamic demand simulation
- Color-coded line management

**Engine Features Used:**
- Grid-based positioning
- Node connection system
- Simple demand simulation
- Color-coded entities

**Missing Features:**
- Free-form path drawing system
- Path intersection validation
- Dynamic line routing

**Slopcade Version:** "Grid-based station connection puzzle where players draw lines to connect colored stations, managing capacity and avoiding intersections."

---

#### 10. Threes! — Number / Merge Puzzle

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ✅ Easy |
| **Time Estimate** | 3-5 days |
| **Engine Fit** | Input: 5/5, Physics: 4/5, Rendering: 5/5, System: 5/5, AI Asset: 5/5 |

**Key Challenges:**
- Grid slide pattern (exists)
- Merge logic with specific rules (1+2=3, 3+3=6, etc.)
- Spawn prediction and preview

**Engine Features Used:**
- Grid Slide pattern (from `game-patterns.md`)
- 2048-style mechanics (already implemented)
- Number display system

**Missing Features:**
- None - uses existing 2048 foundation

**Slopcade Version:** "Grid slide puzzle where players swipe to merge numbered tiles following Threes! rules (1+2=3, 3+3=6, etc.)."

---

#### 11. 2048 — Number / Merge Puzzle

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ✅ Easy |
| **Time Estimate** | 2-3 days |
| **Engine Fit** | 5/5 across all dimensions |

**Key Challenges:**
- None - this is already implemented as a test game

**Engine Features Used:**
- Grid Slide pattern
- Merge logic
- Score tracking

**Slopcade Version:** "Classic 2048 - already exists as test game. Just needs asset theming."

---

#### 12. Flow Free — Path / Grid Puzzle

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ⚠️ Medium |
| **Time Estimate** | 6-10 days |
| **Engine Fit** | Input: 4/5, Physics: 3/5, Rendering: 5/5, System: 3/5, AI Asset: 5/5 |

**Key Challenges:**
- Grid-based path drawing
- Path validation (can't cross, must fill grid)
- Multiple simultaneous paths
- Color matching endpoints

**Engine Features Used:**
- Grid system
- Line rendering
- Color-coded entities

**Missing Features:**
- Grid path drawing system
- Path intersection detection
- Grid fill validation

**Slopcade Version:** "Grid puzzle where players draw colored paths between matching dots, filling the entire grid without crossings."

---

#### 13-14. Two Dots / Dots — Match Puzzle

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ✅ Easy |
| **Time Estimate** | 2-3 days each |
| **Engine Fit** | 5/5 across all dimensions |

**Key Challenges:**
- Simple grid-based connection
- Square detection for bonus
- Gravity after matches

**Engine Features Used:**
- Match-3 system (simpler variant)
- Grid detection
- Gravity system

**Missing Features:**
- None - simpler than existing Match3

**Slopcade Version:** "Connect adjacent dots of the same color to clear them. Make squares for bonus clears."

---

#### 15-16. Kami / Kami 2 — Color-Fill Logic

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ⚠️ Medium |
| **Time Estimate** | 7-10 days each |
| **Engine Fit** | Input: 5/5, Physics: 2/5, Rendering: 5/5, System: 3/5, AI Asset: 5/5 |

**Key Challenges:**
- Region detection and flood-fill
- Limited move constraints
- Pattern-based puzzles
- Color replacement mechanics

**Engine Features Used:**
- Grid-based regions
- Color system
- Move counter

**Missing Features:**
- Flood-fill algorithm
- Region adjacency detection
- Pattern validation

**Slopcade Version:** "Paper-folding puzzle where players tap regions to flood-fill with colors, trying to make the entire board one color in limited moves."

---

#### 17. A Little to the Left — Organizational Puzzle

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ⚠️ Medium |
| **Time Estimate** | 8-12 days |
| **Engine Fit** | Input: 5/5, Physics: 3/5, Rendering: 5/5, System: 2/5, AI Asset: 4/5 |

**Key Challenges:**
- Free-form object placement
- "Correct" position validation (subjective)
- Multiple solution types (align, sort, arrange)
- Satisfying organization feedback

**Engine Features Used:**
- Draggable behavior
- Snap-to-grid (optional)
- Collision detection

**Missing Features:**
- Flexible placement validation system
- Multiple validation criteria
- Subjective "satisfaction" detection

**Slopcade Version:** "Organization puzzle where players drag items to arrange them according to implicit rules (size, color, type)."

---

#### 18-19. Lara Croft GO / Hitman GO — Turn-Based Puzzle

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ⚠️ Medium |
| **Time Estimate** | 10-14 days each |
| **Engine Fit** | Input: 5/5, Physics: 3/5, Rendering: 4/5, System: 3/5, AI Asset: 3/5 |

**Key Challenges:**
- Grid-based turn system
- Enemy AI with movement patterns
- Environmental hazards
- Board game aesthetic

**Engine Features Used:**
- Grid system
- State machines for turns
- Rule-based movement

**Missing Features:**
- Turn-based game system
- Enemy AI behavior trees
- Environmental trigger system

**Slopcade Version:** "Board game-style puzzle where players move a character on grid nodes, avoiding enemies and reaching the exit."

---

#### 20. Prune — Physics / Growth Puzzle

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ⚠️ Medium |
| **Time Estimate** | 8-12 days |
| **Engine Fit** | Input: 4/5, Physics: 3/5, Rendering: 5/5, System: 2/5, AI Asset: 5/5 |

**Key Challenges:**
- Plant growth simulation
- Branching physics
- Pruning mechanic (swipe to cut)
- Light collection mechanic

**Engine Features Used:**
- Distance joints for branches
- Tap/swipe input
- Light sensor areas

**Missing Features:**
- Growth simulation system
- Branching structure generation
- Pruning validation

**Slopcade Version:** "Growth puzzle where players swipe to prune a growing tree, guiding branches toward light while avoiding obstacles."

---

### PHYSICS / CASUAL PUZZLE GAMES (21-27)

#### 21. Cut the Rope — Physics Puzzle

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ✅ Easy |
| **Time Estimate** | 4-6 days |
| **Engine Fit** | Input: 5/5, Physics: 5/5, Rendering: 5/5, System: 4/5, AI Asset: 4/5 |

**Key Challenges:**
- Rope physics with joints
- Tap-to-cut mechanic
- Object delivery to target
- Multiple rope types

**Engine Features Used:**
- Distance joints (ropes)
- Tap input
- Collision detection
- Physics simulation

**Missing Features:**
- None major - joints exist

**Slopcade Version:** "Physics puzzle where players cut ropes to deliver candy to a monster, using gravity and momentum."

---

#### 22. Where's My Water? — Physics Puzzle

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ⚠️ Medium |
| **Time Estimate** | 10-14 days |
| **Engine Fit** | Input: 5/5, Physics: 2/5, Rendering: 4/5, System: 2/5, AI Asset: 4/5 |

**Key Challenges:**
- Fluid simulation (not in Godot 2D by default)
- Dirt digging mechanic
- Water physics (pressure, flow)
- Multiple fluid types

**Engine Features Used:**
- Particle systems (for water approximation)
- Collision detection
- Tap/drag input

**Missing Features:**
- Fluid simulation system
- Destructible terrain
- Pressure physics

**Slopcade Version:** "Particle-based water routing puzzle where players dig paths to guide water to a target."

---

#### 23. World of Goo — Physics / Construction

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ❌ Hard |
| **Time Estimate** | 20+ days |
| **Engine Fit** | Input: 4/5, Physics: 3/5, Rendering: 4/5, System: 2/5, AI Asset: 3/5 |

**Key Challenges:**
- Structure building with physics
- Goo ball collection and deployment
- Complex structural integrity
- Multiple goo types with different properties

**Missing Features:**
- Structure building system
- Complex joint networks
- Collection/deployment mechanics

**Recommendation:** Not recommended. Too complex for current engine.

---

#### 24. Contre Jour — Physics / Light Puzzle

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ⚠️ Medium |
| **Time Estimate** | 12-16 days |
| **Engine Fit** | Input: 4/5, Physics: 3/5, Rendering: 4/5, System: 2/5, AI Asset: 3/5 |

**Key Challenges:**
- Tentacle physics (soft body approximation)
- Light/shadow mechanics
- Multiple interaction types
- Atmospheric rendering

**Missing Features:**
- Soft body physics approximation
- Dynamic lighting system
- Tentacle rendering

**Slopcade Version:** "Physics puzzle with chain-based tentacles that players manipulate to navigate levels."

---

#### 25. Tomb of the Mask — Arcade Puzzle

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ✅ Easy |
| **Time Estimate** | 3-5 days |
| **Engine Fit** | 5/5 across all dimensions |

**Key Challenges:**
- Grid slide movement (swipe to move until obstacle)
- Obstacle collision
- Collectibles and enemies
- Level progression

**Engine Features Used:**
- Grid Slide pattern
- Collision detection
- State machines

**Missing Features:**
- None - straightforward implementation

**Slopcade Version:** "Fast-paced grid puzzle where players swipe to slide a character through maze-like levels, collecting items and avoiding enemies."

---

#### 26. Brain It On! — Draw-Physics Puzzle

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ❌ Hard |
| **Time Estimate** | 25+ days |
| **Engine Fit** | Input: 3/5, Physics: 2/5, Rendering: 3/5, System: 1/5, AI Asset: 5/5 |

**Key Challenges:**
- Free-form drawing that becomes physics objects
- Shape recognition and conversion to physics bodies
- Complex collision shapes from drawings

**Missing Features:**
- Drawing system
- Shape-to-physics conversion
- Complex polygon generation

**Recommendation:** Not recommended. Requires major drawing/physics integration.

---

#### 27. Angry Birds — Physics / Destruction

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ✅ Easy |
| **Time Estimate** | 3-5 days |
| **Engine Fit** | 5/5 across all dimensions |

**Key Challenges:**
- Already implemented as Slopeggle (Peggle-like)
- Same drag-to-aim physics
- Structure destruction

**Engine Features Used:**
- Physics projectile pattern
- Drag-to-aim input
- Collision detection
- Structure building with joints

**Missing Features:**
- None - already exists

**Slopcade Version:** "Physics destruction game where players launch projectiles at structures to defeat enemies."

---

### LIGHT SIM / MANAGEMENT GAMES (28-35)

#### 28-35. Simulation Games (Tiny Tower, Pocket Planes/Trains, Fallout Shelter, Mini Cities, Game Dev Tycoon, Idle Miner)

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ❌ Hard |
| **Time Estimate** | 15-25+ days each |

**Common Challenges:**
- Complex simulation systems
- Time-based progression
- Resource management
- Upgrade/tech trees
- Complex UI requirements

**Missing Features:**
- Simulation engine
- Time management systems
- Complex UI framework
- Progression systems

**Exception:**

#### 34. Universal Paperclips — Incremental / Systems Sim

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ✅ Easy |
| **Time Estimate** | 4-6 days |
| **Engine Fit** | Input: 5/5, Physics: 1/5, Rendering: 4/5, System: 3/5, AI Asset: 5/5 |

**Key Challenges:**
- Primarily UI/number manipulation
- Minimal physics/visuals
- Simple progression system

**Slopcade Version:** "Incremental game where players make paperclips, automate production, and manage resources. UI-heavy, minimal physics."

---

### SORT / MERGE / RELAXED PUZZLE GAMES (36-40)

#### 36-37. Water Sort Puzzle / Goods Sort — Sorting Puzzle

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ✅ Easy |
| **Time Estimate** | 2-3 days each |
| **Engine Fit** | 5/5 across all dimensions |

**Key Challenges:**
- Already implemented as Ball Sort
- Same tube/container system
- Just different theming

**Engine Features Used:**
- Ball Sort system
- Container/stack logic
- Pick & Place pattern

**Missing Features:**
- None - already exists

**Slopcade Version:** "Sort colored liquids (or goods) into tubes until each tube contains only one color."

---

#### 38. Triple Town — Merge Puzzle

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ✅ Easy |
| **Time Estimate** | 4-6 days |
| **Engine Fit** | Input: 5/5, Physics: 3/5, Rendering: 5/5, System: 4/5, AI Asset: 5/5 |

**Key Challenges:**
- Grid-based merging (3+ items → upgrade)
- Bear movement AI
- Strategic placement

**Engine Features Used:**
- Grid system
- Merge logic
- Simple AI movement

**Missing Features:**
- Minimal - similar to 2048 with different merge rules

**Slopcade Version:** "Grid puzzle where players place items to create merges. Three grasses become a bush, three bushes become a tree, etc."

---

#### 39. Merge Dragons! — Merge / Collection

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ⚠️ Medium |
| **Time Estimate** | 10-14 days |
| **Engine Fit** | Input: 5/5, Physics: 3/5, Rendering: 4/5, System: 3/5, AI Asset: 4/5 |

**Key Challenges:**
- Camp management (free-form placement)
- Merge chains
- Level progression
- Healing dead land mechanic

**Missing Features:**
- Free-form placement validation
- Camp persistence system
- Complex merge chains

**Slopcade Version:** "Merge puzzle with camp management. Players merge items on a grid, complete levels, and build a persistent camp."

---

#### 40. Unpacking — Cozy Organization

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ⚠️ Medium |
| **Time Estimate** | 8-12 days |
| **Engine Fit** | Input: 5/5, Physics: 3/5, Rendering: 5/5, System: 2/5, AI Asset: 3/5 |

**Key Challenges:**
- Free-form item placement
- Context-aware "correct" positions
- Narrative through objects
- Multiple rooms/environments

**Missing Features:**
- Flexible validation system
- Context-sensitive placement

**Slopcade Version:** "Organization puzzle where players unpack boxes and arrange items in rooms. Context-aware placement validation."

---

### WORD / GRID / CLASSICS GAMES (41-45)

#### 41. Crossy Road — Endless Arcade

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ⚠️ Medium |
| **Time Estimate** | 6-10 days |
| **Engine Fit** | Input: 3/5, Physics: 4/5, Rendering: 5/5, System: 4/5, AI Asset: 4/5 |

**Key Challenges:**
- Needs virtual controls or tap zones (not implemented)
- Endless procedural generation
- Obstacle patterns (cars, trains, water)

**Engine Features Used:**
- Grid-based movement
- Collision detection
- Procedural generation

**Missing Features:**
- Virtual D-pad or tap zones
- Endless world generation

**Slopcade Version:** "Endless frogger-style game where players cross roads and rivers. Needs virtual controls implementation."

---

#### 42. Wordscapes — Word Puzzle

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ✅ Easy |
| **Time Estimate** | 3-5 days |
| **Engine Fit** | Input: 5/5, Physics: 2/5, Rendering: 5/5, System: 4/5, AI Asset: 5/5 |

**Key Challenges:**
- Word validation (needs dictionary)
- Circle letter selection
- Crossword-style grid filling

**Engine Features Used:**
- Grid system
- Letter display
- Word list validation

**Missing Features:**
- Dictionary/word list integration

**Slopcade Version:** "Word puzzle where players form words from a circle of letters to fill a crossword grid."

---

#### 43. SpellTower — Word / Grid

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ✅ Easy |
| **Time Estimate** | 4-6 days |
| **Engine Fit** | 5/5 across all dimensions |

**Key Challenges:**
- Grid-based word search
- Line drawing for word selection
- Gravity after word clears
- Rising stack pressure

**Engine Features Used:**
- Grid system
- Word validation
- Gravity system

**Missing Features:**
- Minimal - similar to other grid games

**Slopcade Version:** "Word search puzzle where players find words by connecting adjacent letters. Cleared letters drop, stack rises."

---

#### 44. Ridiculous Fishing — Arcade / Physics

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ⚠️ Medium |
| **Time Estimate** | 8-12 days |
| **Engine Fit** | Input: 4/5, Physics: 4/5, Rendering: 4/5, System: 3/5, AI Asset: 4/5 |

**Key Challenges:**
- Multi-phase gameplay (cast, avoid, catch, shoot)
- Upgrade system
- Fish collection
- Physics-based hook movement

**Missing Features:**
- Multi-phase game state system
- Upgrade/shop system

**Slopcade Version:** "Multi-phase fishing game: cast deep, avoid fish on way down, catch fish on way up, shoot them for money."

---

#### 45. Desert Golfing — Minimalist Skill

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ✅ Easy |
| **Time Estimate** | 3-5 days |
| **Engine Fit** | 5/5 across all dimensions |

**Key Challenges:**
- Simple golf swing mechanic
- Endless desert generation
- Minimalist aesthetic

**Engine Features Used:**
- Drag-to-aim input
- Physics projectile
- Simple terrain

**Missing Features:**
- None - straightforward

**Slopcade Version:** "Minimalist endless golf game. Players swipe to hit ball across an infinite desert. Simple, meditative."

---

### DESIGN-FORWARD INSPIRATION GAMES (46-50)

#### 46. Florence — Narrative Puzzle

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ❌ Hard |
| **Time Estimate** | 20+ days |
| **Engine Fit** | Input: 5/5, Physics: 2/5, Rendering: 4/5, System: 1/5, AI Asset: 3/5 |

**Key Challenges:**
- Narrative-driven experience
- Variety of mini-games
- Emotional storytelling
- Hand-drawn art style

**Missing Features:**
- Narrative system
- Scene management
- Variety of mini-game frameworks

**Recommendation:** Not recommended. Requires narrative engine and diverse mechanics.

---

#### 47. Gorogoa — Illustrated Puzzle

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ❌ Hard |
| **Time Estimate** | 25+ days |
| **Engine Fit** | Input: 4/5, Physics: 2/5, Rendering: 3/5, System: 1/5, AI Asset: 2/5 |

**Key Challenges:**
- Image manipulation (stacking, combining)
- Complex logic puzzles
- Detailed hand-drawn art
- Layered scene transitions

**Missing Features:**
- Image manipulation system
- Complex puzzle logic
- Art pipeline for detailed illustrations

**Recommendation:** Not recommended. Requires unique image manipulation system.

---

#### 48. Old Man's Journey — Landscape Puzzle

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ❌ Hard |
| **Time Estimate** | 18+ days |
| **Engine Fit** | Input: 4/5, Physics: 3/5, Rendering: 3/5, System: 2/5, AI Asset: 2/5 |

**Key Challenges:**
- Hand-drawn art style
- Landscape manipulation
- Narrative elements
- Character pathfinding

**Missing Features:**
- Pathfinding system
- Detailed art pipeline

**Recommendation:** Not recommended. Art requirements exceed AI generation capabilities.

---

#### 49. Device 6 — Textual / Spatial

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ❌ Hard |
| **Time Estimate** | 25+ days |
| **Engine Fit** | Input: 3/5, Physics: 1/5, Rendering: 3/5, System: 1/5, AI Asset: 1/5 |

**Key Challenges:**
- Text manipulation as gameplay
- Spatial audio integration
- Narrative puzzle design
- Unique presentation

**Missing Features:**
- Text manipulation system
- Audio integration

**Recommendation:** Not recommended. Entirely different genre.

---

#### 50. Hook — Minimalist Logic

| Attribute | Assessment |
|-----------|------------|
| **Feasibility** | ✅ Easy |
| **Time Estimate** | 3-5 days |
| **Engine Fit** | 5/5 across all dimensions |

**Key Challenges:**
- Line/chain untangling
- Minimalist design
- Satisfying removal mechanic

**Engine Features Used:**
- Chain physics
- Tap input
- Simple line rendering

**Missing Features:**
- None - straightforward

**Slopcade Version:** "Minimalist puzzle where players tap to retract hooks in the correct order to untangle lines."

---

## Tier Recommendations

### Tier 1: Ready Now (1-3 days)

**15 Games - Build These First**

These games use existing engine systems with minimal or no new development required.

| Game | Days | Why It's Easy |
|------|------|---------------|
| 2048 | 2-3 | Grid slide pattern exists |
| Two Dots | 2-3 | Match-3 variant |
| Dots | 2-3 | Simple connection |
| Water Sort Puzzle | 2-3 | Ball Sort system exists |
| Goods Sort | 2-3 | Ball Sort variant |
| Hook | 3-5 | Simple chain physics |
| Threes! | 3-5 | 2048 foundation |
| Tomb of the Mask | 3-5 | Grid slide + obstacles |
| Angry Birds | 3-5 | Slopeggle exists |
| Desert Golfing | 3-5 | Simple physics |
| Wordscapes | 3-5 | Word grid |
| Cut the Rope | 4-6 | Rope joints exist |
| SpellTower | 4-6 | Word search grid |
| Triple Town | 4-6 | Merge pattern |
| Universal Paperclips | 4-6 | UI/numbers only |

**Total Tier 1: 15 games**

---

### Tier 2: Easy Add (1-2 weeks)

**18 Games - Build After Quick Wins**

These require minor new systems or pattern adaptations.

| Game | Days | What to Build |
|------|------|---------------|
| Flow Free | 6-10 | Grid path drawing |
| Crossy Road | 6-10 | Virtual controls |
| Kami | 7-10 | Flood-fill system |
| Kami 2 | 7-10 | Same as Kami |
| Prune | 8-12 | Growth simulation |
| A Little to the Left | 8-12 | Placement validation |
| Unpacking | 8-12 | Context-aware placement |
| Monument Valley | 8-12 | 2D perspective shift |
| Monument Valley 2 | 8-12 | Same as MV1 |
| Ridiculous Fishing | 8-12 | Multi-phase states |
| Mini Metro | 10-14 | Path drawing |
| Mini Motorways | 10-14 | Same as Mini Metro |
| Lara Croft GO | 10-14 | Turn-based system |
| Hitman GO | 10-14 | Same as Lara Croft |
| Merge Dragons! | 10-14 | Camp management |
| Where's My Water? | 10-14 | Particle fluid approx |
| Contre Jour | 12-16 | Tentacle physics |
| World of Goo | 20+ | Too complex |

**Total Tier 2: 18 games**

---

### Tier 3: Medium Effort (2-4 weeks)

**12 Games - Consider Carefully**

These need significant engine work but are theoretically possible.

| Game | Days | Blockers |
|------|------|----------|
| Baba Is You | 20+ | Rule manipulation engine |
| World of Goo | 20+ | Structure building |
| Tiny Tower | 25+ | Simulation systems |
| Pocket Planes | 20+ | Route planning |
| Pocket Trains | 20+ | Same as Planes |
| Fallout Shelter | 25+ | Complex management |
| Mini Cities | 18+ | City simulation |
| Game Dev Tycoon | 20+ | Complex progression |
| Idle Miner Tycoon | 15+ | Idle systems |
| Florence | 20+ | Narrative engine |
| Gorogoa | 25+ | Image manipulation |
| Old Man's Journey | 18+ | Pathfinding + art |

**Total Tier 3: 12 games**

---

### Tier 4: Hard / Not Recommended

**5 Games - Skip These**

| Game | Why Not |
|------|---------|
| The Room (all) | Requires 3D |
| Blackbox | Device sensors needed |
| Brain It On! | Drawing system too complex |
| Device 6 | Entirely different genre |
| The Room series | 3D manipulation |

**Total Tier 4: 5 games**

---

## Top 10 Recommendations

Based on engine fit, implementation difficulty, and market appeal:

### 1. Water Sort Puzzle ⭐
**Category:** Sorting Puzzle  
**Feasibility:** ✅ Easy (2-3 days)  
**Why:** Ball Sort system already exists. Just needs new assets. Immediate market validation.  
**Resembles:** Ball Sort test game  
**Market Appeal:** 20/25 - Proven viral puzzle format

### 2. 2048 ⭐
**Category:** Number/Merge  
**Feasibility:** ✅ Easy (2-3 days)  
**Why:** Already implemented as test game. Classic, proven mechanic.  
**Resembles:** Existing test game  
**Market Appeal:** 22/25 - Timeless classic

### 3. Angry Birds / Slopeggle Variant ⭐
**Category:** Physics/Destruction  
**Feasibility:** ✅ Easy (3-5 days)  
**Why:** Slopeggle proves the physics projectile system works. Add destruction mechanics.  
**Resembles:** Slopeggle test game  
**Market Appeal:** 23/25 - Satisfying physics

### 4. Cut the Rope ⭐
**Category:** Physics Puzzle  
**Feasibility:** ✅ Easy (4-6 days)  
**Why:** Uses existing joint physics. Clear, appealing mechanic. Strong brand recognition.  
**Resembles:** Rope/Swing game type  
**Market Appeal:** 21/25 - Cute + physics

### 5. Triple Town ⭐
**Category:** Merge Puzzle  
**Feasibility:** ✅ Easy (4-6 days)  
**Why:** Builds on 2048 grid system. Satisfying merge progression.  
**Resembles:** 2048 with different merge rules  
**Market Appeal:** 19/25 - Strategic depth

### 6. Flow Free ⭐
**Category:** Path/Grid  
**Feasibility:** ⚠️ Medium (6-10 days)  
**Why:** Teaches us path drawing/validation. High market appeal. Clean aesthetic.  
**Resembles:** Grid pattern games  
**Market Appeal:** 21/25 - Meditative puzzle

### 7. Crossy Road ⭐
**Category:** Endless Arcade  
**Feasibility:** ⚠️ Medium (6-10 days)  
**Why:** Forces implementation of virtual controls (critical gap). Proven endless format.  
**Resembles:** Grid-based movement  
**Market Appeal:** 22/25 - Arcade appeal

### 8. Monument Valley (2D Version) ⭐
**Category:** Spatial Puzzle  
**Feasibility:** ⚠️ Medium (8-12 days)  
**Why:** Pushes our visual capabilities. Strong brand. Unique mechanic translation challenge.  
**Resembles:** Grid with perspective shifts  
**Market Appeal:** 24/25 - Design award winner

### 9. Hook ⭐
**Category:** Minimalist Logic  
**Feasibility:** ✅ Easy (3-5 days)  
**Why:** Simple, elegant mechanic. Minimal assets needed. Satisfying chain reaction.  
**Resembles:** Chain reaction pattern  
**Market Appeal:** 18/25 - Minimalist appeal

### 10. Mini Metro ⭐
**Category:** Systems/Optimization  
**Feasibility:** ⚠️ Medium (10-14 days)  
**Why:** Teaches path drawing systems. High strategic depth. Beautiful minimalist design.  
**Resembles:** Grid connection games  
**Market Appeal:** 20/25 - Strategy appeal

---

## Gap Analysis

### Critical Gaps (Unlock Most Games)

#### 1. Virtual On-Screen Controls
**Impact:** Unlocks 8+ games (Crossy Road, platformers, shooters)  
**Effort:** 1-2 weeks  
**Description:** D-pad and action buttons for native mobile  
**Games Unlocked:** Crossy Road, Lara Croft GO, Hitman GO, platformers

#### 2. Path Drawing System
**Impact:** Unlocks 5+ games (Mini Metro, Flow Free, Brain It On!)  
**Effort:** 1-2 weeks  
**Description:** Free-form line drawing with validation  
**Games Unlocked:** Mini Metro, Mini Motorways, Flow Free, connection puzzles

#### 3. Grid Path Validation
**Impact:** Unlocks 4+ games (Flow Free, Tomb of the Mask variants)  
**Effort:** 3-5 days  
**Description:** Validate paths on grids (no crossings, complete fill)  
**Games Unlocked:** Flow Free, path puzzles

### Secondary Gaps

#### 4. Flood-Fill Algorithm
**Impact:** Unlocks Kami games  
**Effort:** 2-3 days  
**Description:** Region detection and color filling

#### 5. Turn-Based Game System
**Impact:** Unlocks GO games  
**Effort:** 1 week  
**Description:** Turn management, enemy AI patterns

#### 6. Placement Validation System
**Impact:** Unlocks organization games  
**Effort:** 1 week  
**Description:** Flexible "correct position" detection

#### 7. Word/Dictionary Integration
**Impact:** Unlocks word games  
**Effort:** 2-3 days  
**Description:** Word list validation API

#### 8. Growth Simulation
**Impact:** Unlocks Prune  
**Effort:** 1 week  
**Description:** Plant/branch growth mechanics

### Not Recommended (Too Specialized)

- Fluid simulation (Where's My Water?)
- Drawing-to-physics conversion (Brain It On!)
- 3D rendering (The Room)
- Rule manipulation (Baba Is You)
- Narrative systems (Florence)

---

## Implementation Roadmap

### Phase 1: Quick Wins (Weeks 1-2)
**Goal:** Ship 5 games, validate engine

1. **Water Sort Puzzle** (2-3 days)
   - Uses existing Ball Sort system
   - New liquid-themed assets
   - Immediate market test

2. **2048** (2-3 days)
   - Already implemented
   - Polish and release

3. **Hook** (3-5 days)
   - Simple chain physics
   - Minimalist aesthetic
   - Test chain reactions

4. **Angry Birds Variant** (3-5 days)
   - Extend Slopeggle
   - Add destruction
   - Test physics satisfaction

5. **Desert Golfing** (3-5 days)
   - Simple endless mechanic
   - Test procedural generation

**Phase 1 Deliverable:** 5 released games, engine validation

---

### Phase 2: Enabler Features (Weeks 3-4)
**Goal:** Build systems that unlock more games

1. **Virtual Controls** (1 week)
   - D-pad component
   - Action buttons
   - Unlocks: Crossy Road, platformers

2. **Path Drawing** (1 week)
   - Line drawing input
   - Path validation
   - Unlocks: Mini Metro, Flow Free

**Phase 2 Deliverable:** 2 major systems, 2-3 new games

---

### Phase 3: Tier 2 Expansion (Weeks 5-8)
**Goal:** Ship 8 more games using new systems

1. **Crossy Road** (with virtual controls)
2. **Flow Free** (with path drawing)
3. **Mini Metro** (with path drawing)
4. **Cut the Rope** (rope physics)
5. **Triple Town** (merge mechanics)
6. **Wordscapes** (word validation)
7. **Tomb of the Mask** (grid slide)
8. **SpellTower** (word grid)

**Phase 3 Deliverable:** 8 additional games, 13 total

---

### Phase 4: Polish & Advanced (Weeks 9-12)
**Goal:** Tackle medium-complexity games

1. **Monument Valley 2D** (perspective system)
2. **Prune** (growth simulation)
3. **Kami** (flood-fill)
4. **Lara Croft GO** (turn-based)

**Phase 4 Deliverable:** 4 premium games, 17 total

---

### Release Cadence Recommendation

- **Weeks 1-4:** 2 games/week (quick wins)
- **Weeks 5-8:** 2 games/week (Tier 2)
- **Weeks 9-12:** 1 game/week (Tier 3)

**12-Week Target:** 17 games released

---

## Summary

**Immediate Action Items:**
1. Ship Water Sort (2 days)
2. Ship 2048 (2 days)
3. Build virtual controls (1 week)
4. Build path drawing (1 week)

**Biggest Opportunities:**
- 15 games ready now (Tier 1)
- 18 games with minor work (Tier 2)
- 3 critical gaps unlock 12+ games

**Avoid:**
- 3D games (The Room)
- Complex narrative (Florence)
- Drawing-to-physics (Brain It On!)

**Success Metrics:**
- 5 games in 2 weeks
- 13 games in 8 weeks
- 17 games in 12 weeks

---

*Report generated January 2026 for Slopcade Engineering Team*
