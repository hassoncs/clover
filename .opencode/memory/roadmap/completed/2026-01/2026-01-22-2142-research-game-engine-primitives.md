---
title: "Research game engine primitives"
agent: oracle
created: 2026-01-22T21:42:59.570Z
session_id: ses_41857218affehPnAGS2TEySyM0
duration: 14s
---

# Research game engine primitives

**Bottom line**
The “power” in child-friendly game engines comes from a small set of orthogonal primitives that compose: (1) an entity model, (2) an event system, (3) mutable state, and (4) time-based control flow. Scratch/GameMaker/Construct all converge on these, then add a few “accelerators” (spawning, collisions, animation, camera) that unlock most game genres without increasing conceptual load too much.

**Action plan (prioritized primitives to implement/design around)**
1. **Entities + Components (Sprite/Object as the unit of meaning)**  
   - Primitive: “Thing in the world” with properties: position, size, direction, appearance, tags.  
   - Scratch: Sprite/Clone; GameMaker: Object/Instance; Construct: Object/Instance.  
2. **Events (When X happens…)**  
   - Primitive: event handlers that trigger scripts: `on start`, `on key pressed`, `on click/tap`, `on timer`, `on collide`, `on message`.  
   - Scratch: hat blocks; GameMaker: event tabs; Construct: event sheets.  
3. **State (Variables + Lists + Per-entity fields)**  
   - Primitive: global variables (score), per-entity variables (hp), lists/arrays (inventory, wave definitions).  
   - Scratch: variables/lists; GameMaker: instance variables + data structures; Construct: instance variables + arrays/dictionaries.  
4. **Time + Control Flow (The “game loop” without teaching the loop)**  
   - Primitive: `every frame`, `wait`, `repeat`, `forever`, `for each entity`, plus a stable delta-time notion (even if hidden).  
   - Scratch: forever/wait; GameMaker: Step event; Construct: Every tick / System conditions.  
5. **Messaging (Broadcast/Signals) to decouple systems**  
   - Primitive: `broadcast "game over"`, `emit event "took damage"`, `on message`.  
   - This is the simplest scalable alternative to “everything references everything.”  
6. **Spawning (Instantiate/Clone) + Despawning (Destroy) + Ownership**  
   - Primitive: `spawn bullet at player`, `destroy when offscreen`, “clones inherit variables.”  
   - This enables projectiles, particles, enemies, pickups, UI popups.  
7. **Collision + Overlap Queries (Physics-lite, not physics-first)**  
   - Primitive: `touching?`, `overlaps tag Enemy`, `solid walls`, `separate` response.  
   - Keep it predictable: start with AABB/tiles + simple separation; add bounce/gravity as opt-in.  
8. **Random + Sampling (Controlled randomness)**  
   - Primitive: random number, random choice from list, weighted choice, shuffle, “random point in region.”  
9. **Regions/Zones (Spatial triggers as first-class)**
