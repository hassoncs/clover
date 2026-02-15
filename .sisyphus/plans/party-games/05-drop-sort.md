# Drop Sort

> **Wave**: 5 | **Tier**: 5 | **Effort**: XL | **Players**: 1-8
> **Category**: Real-time Cooperative Puzzle

## Concept
A high-velocity sorting factory where knowledge meets gravity. Answers to a category (e.g., "Movies by Release Date") fall from the top of the screen like Tetris blocks. The team must work together in real-time to drag, rotate, and slot these blocks into the correct sequence before they hit the floor and lock in place.

## Core Mechanic
Real-time shared physics board. Unlike previous games where players submit answers and wait, Drop Sort is continuous. Blocks representing data points fall at increasing speeds. Players use their devices as touchpads to "grab" a falling block and move it horizontally or accelerate its fall. The goal is to arrange them from left-to-right (or bottom-to-top) in the correct order.

## Game Flow
1. **Lobby** → Players join; difficulty is set based on player count.
2. **Category Reveal** → The sorting criteria is shown (e.g., "Heaviest to Lightest Animals").
3. **The Drop (Wave 1-3)** → 
    - Blocks begin falling.
    - Players must communicate: "I've got the Blue Whale, that goes on the far right!"
    - If a block is placed out of order, it "glitches," shaking and reducing the available space.
4. **Solo Survival (Intermission)** → One player is chosen to handle a rapid-fire sequence of 5 blocks alone while others "cheer" (tap to slow down time).
5. **The Mega-Stack (Finale)** → A massive 20-item list falls in rapid succession. The team must build a perfect tower of knowledge.

## Scoring System
- **Correct Placement**: +200 points per block in the right relative position.
- **Perfect Sequence**: +1000 bonus for a completely correct row.
- **Speed Bonus**: Points multiplier based on how high the block was when it was "locked."
- **Height Penalty**: If the stack reaches the top of the screen, the round ends early.

## Content Requirements
- **Sorting Sets**: 500+ categories across History, Science, Pop Culture, and "Vibe" (e.g., "How much this food hurts to step on").
- **Block Visuals**: Procedural skins for blocks (metal, wood, jelly) that affect their physics properties.

## Technical Implementation
### Template Changes
- **Real-time Physics Canvas**: A high-performance Godot-based main screen that can handle 20+ physics bodies with low-latency updates from 8 different controllers.

### New Infrastructure
- **Real-time Shared Board Engine**: 
    - **Authoritative Physics**: The server (or host) calculates collisions and positions, but clients need "Predictive Drag" to feel responsive.
    - **Multi-User Drag-and-Drop**: Logic to handle "ownership" of a block when two players try to grab it simultaneously (first-come-first-served with visual feedback).
    - **Collision/Order Rules**: A semantic validation layer that checks the relative position of physics bodies against a sorted list of IDs.
- **Low-Latency Input Pipeline**: Bypassing the standard "Phase-based" state machine for a "Stream-based" input model where device coordinates are piped directly to the Godot engine.

### Input Types Used
- **Touchpad/Joystick**: For moving blocks in 2D space.
- **Rotate Button**: To flip blocks (if they have different shapes).
- **Slam Button**: To lock a block in place instantly.

### Estimated Phases
- `LOBBY`
- `CATEGORY_INTRO`
- `ACTIVE_DROP`
- `VALIDATION_ANIMATION`
- `SURVIVAL_MODE`
- `RESULTS`

## Dependencies
- **Wave 4 Real-time Sync**: Foundation for coordinate sharing.
- **Godot Physics Integration**: Essential for the "feel" of the blocks.

## Design Notes
Drop Sort is a flagship Wave 5 game because it breaks the "turn-based" nature of party games. It requires a fundamental shift in how we handle inputs—moving from "Submit" to "Stream." The infrastructure built here (Shared Board Engine) is reusable for any real-time coop game, including digital board games or physics-based builders. The primary risk is network jitter making the blocks "teleport"; this will require sophisticated interpolation on the main screen.
