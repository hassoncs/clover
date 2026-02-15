# Family Frenzy

> **Wave**: 5 | **Tier**: 5 | **Effort**: XL | **Players**: 3-8
> **Category**: Real-time Chaotic Cooperative

## Concept
A family of suburban monsters (The Frenzies) is trying to pass as a normal human family. To survive, they must complete a barrage of mundane household chores (mowing the lawn, fixing the sink, feeding the "dog") in real-time. However, each family member also has "Selfish Urges" that grant individual points but risk exposing the whole family.

## Core Mechanic
Continuous concurrent task management. Unlike turn-based games, Family Frenzy is a "live" simulation. Tasks appear on the main screen and individual devices simultaneously. Some tasks are solo (e.g., "Tap to scrub the plate"), while others are cooperative (e.g., "One person holds the ladder, another person climbs"). Players must verbally coordinate to ensure the "Danger Meter" doesn't overflow.

## Game Flow
1. **Lobby** → Players join and are assigned family roles (Mom, Dad, Kid, Grunkle).
2. **The Three-Day Week** → 
    - **Day 1 (Easy)**: Slow task rate. Focus on learning the "Co-op Tasks."
    - **Day 2 (Medium)**: "Selfish Tasks" appear. These are private prompts that give individual points but increase the shared Danger Meter (e.g., "Eat the neighbor's cat").
    - **Day 3 (Hard)**: Rapid-fire tasks. "Emergency Events" (like a neighbor knocking) require everyone to freeze or perform a specific action simultaneously.
3. **The Inspection (Finale)** → A final sequence where the family must perform a series of complex, multi-person tasks to prove their "humanity" to a suspicious inspector.

## Scoring System
- **Shared Family Score**: Based on the percentage of household tasks completed.
- **Individual "Cool" Score**: Based on completed Selfish Tasks.
- **Danger Meter**: If this hits 100%, the family is "Exposed," and the shared score is halved.
- **Win Condition**: High shared score + low danger = "Human Success." High individual score = "Winner of the Family."

## Content Requirements
- **Household Tasks**: 100+ unique mini-games (tapping, swiping, rotating, shouting).
- **Selfish Urges**: 50+ secret prompts that conflict with the shared goals.
- **Emergency Events**: 10+ high-stress group events.

## Technical Implementation
### Template Changes
- **Multi-Lane Task UI**: A device interface that can display 2-3 active tasks at once, each with its own timer and input type.
- **Shared Danger HUD**: A persistent overlay on the main screen and all devices.

### New Infrastructure
- **Continuous Concurrent Task Scheduler**: 
    - **Multi-Lane Async Tasks**: A backend engine that manages dozens of overlapping timers and task states. It must handle tasks that are "Global" (everyone sees), "Targeted" (only Mom and Kid see), or "Private" (only Dad sees).
    - **Conflict Handling**: Logic to manage what happens when two players try to do the same solo task, or when a player abandons a co-op task halfway through.
- **Real-time State Synchronization**: High-frequency updates (10Hz+) to ensure the Danger Meter and task progress bars feel responsive across all devices.
- **Verbal Coordination Triggers**: (Optional) Using the microphone to detect if players are actually talking during co-op tasks.

### Input Types Used
- **Rapid Tap**: For "scrubbing" or "fixing."
- **Precision Slide**: For "balancing" or "pouring."
- **Synchronized Hold**: For multi-person tasks.
- **Voice Detection**: For "shouting" or "distracting."

### Estimated Phases
- `LOBBY`
- `DAY_START_ANIMATION`
- `ACTIVE_SIMULATION` (Continuous for 3-5 minutes)
- `EMERGENCY_EVENT` (Interruption)
- `DAY_END_SUMMARY`
- `FINAL_INSPECTION`
- `RESULTS`

## Dependencies
- **Wave 4 Real-time Sync**: Critical for the "live" feel of the simulation.
- **Wave 4 Private Messaging**: For delivering "Selfish Urges."

## Design Notes
Family Frenzy is the "chaos engine" of Wave 5. It's designed to be loud, frantic, and hilarious. The technical investment in the "Concurrent Task Scheduler" is massive but pays off by enabling a whole new genre of "Overcooked-style" party games. It moves the platform away from "waiting for others" to "everyone acting at once." The primary risk is cognitive overload—if too many tasks appear, players may stop communicating and just panic.
