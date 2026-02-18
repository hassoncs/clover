# Slingshot Dome

> **Wave**: 5 | **Tier**: 5 | **Effort**: XL | **Players**: 1-8
> **Category**: Real-time Action Physics

## Concept
A neon-soaked gladiatorial arena where players control high-velocity energy orbs. Using their phones as slingshots, players launch themselves across the "Dome" to smash into waves of robotic invaders, trigger environmental traps, and combine their momentum for devastating "Fusion Attacks."

## Core Mechanic
Slingshot Physics. Players touch their device screen, pull back (visualizing a trajectory line), and release to launch their avatar on the main screen. The game uses a full 2D physics engine (gravity, friction, restitution). Combat is entirely momentum-based: the faster you hit an enemy, the more damage you deal.

## Game Flow
1. **Lobby** → Players join and customize their orb's color and "Trail Effect."
2. **The Arena (Waves 1-5)** → 
    - **Spawn Phase**: Enemies enter from the edges. Some have shields, others shoot slow-moving projectiles.
    - **Action Phase**: Players launch themselves. Smashing into an enemy "pops" it. Smashing into a teammate triggers a "Bumper Bonus" (both players gain speed).
    - **Power-up Drop**: Mid-wave, items like "Multi-Shot" or "Black Hole" appear in the arena.
3. **The Boss** → A massive mechanical beast with specific weak points that can only be hit from certain angles or at high speeds.
4. **Victory Lap** → A 30-second "Free Play" where players can bounce around and collect remaining gems for bonus points.

## Scoring System
- **Enemy Pop**: +100 points.
- **Combo Multiplier**: Increases for every enemy hit before touching the floor.
- **Fusion Attack**: +500 points when two players hit the same enemy within 0.5 seconds.
- **Speed Demon**: Bonus for maintaining a high average velocity.
- **Survival**: Points deducted for taking damage from enemy projectiles.

## Content Requirements
- **Enemy Types**: 15+ robots with different behaviors (Swarmers, Snipers, Tanks).
- **Arena Layouts**: 10+ maps with different gravity zones, bumpers, and hazards.
- **Power-ups**: 12+ unique abilities that modify the physics (e.g., "Heavy Orb" increases damage but reduces speed).

## Technical Implementation
### Template Changes
- **Physics Arena Template**: A Godot-based main screen optimized for high-speed collisions and particle effects.
- **Slingshot Controller**: A specialized mobile UI that translates "Drag-and-Release" gestures into vector data (angle + magnitude).

### New Infrastructure
- **Real-time Action Physics Engine**: 
    - **Authoritative Server Simulation**: To prevent cheating and ensure all players see the same collisions, the physics must be calculated on the host/server.
    - **Client-Side Prediction**: The mobile device must show the "Trajectory Line" and the initial "Launch" instantly to hide network latency.
    - **Entity Interpolation**: Smoothly rendering the movement of 8 players and 20+ enemies at 60fps on the main screen.
- **Vector Input Pipeline**: A high-frequency data stream that sends launch vectors from devices to the physics engine with sub-50ms latency.

### Input Types Used
- **Slingshot (Drag-to-Aim)**: The primary input.
- **Brake (Tap)**: To stop momentum instantly (on a cooldown).
- **Special Ability (Button)**: To trigger collected power-ups.

### Estimated Phases
- `LOBBY`
- `LEVEL_INTRO`
- `WAVE_ACTIVE` (Continuous action)
- `BOSS_ENCOUNTER`
- `VICTORY_LAP`
- `RESULTS`

## Dependencies
- **Wave 4 Real-time Sync**: Foundation for all movement.
- **Godot Physics Engine**: The core of the gameplay.

## Design Notes
Slingshot Dome is the "action flagship" of Wave 5. It proves that the Slopcade platform can handle more than just "party games"—it can handle "real games." The infrastructure built here (Authoritative Physics + Vector Input) is the most advanced in the project and enables future genres like racing, sports, or brawlers. The primary risk is "Network Lag" making the game feel unresponsive; this will require the most tuning of any game in the library.
