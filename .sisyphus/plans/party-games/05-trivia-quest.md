# Trivia Quest

> **Wave**: 5 | **Tier**: 5 | **Effort**: XL | **Players**: 1-8
> **Category**: Cooperative RPG / Trivia

## Concept
A fantasy dungeon crawl where your knowledge is your weapon. Players form a classic RPG party (Warrior, Mage, Rogue, Cleric) and traverse a procedurally generated dungeon. Every encounter—from picking a lock to slaying a dragon—is resolved through trivia questions.

## Core Mechanic
RPG Combat via Trivia. Each player has a "Class" with unique stats (Attack, Health, Gold) and a "Special Ability" that triggers on correct answers.
- **Warrior**: Deals double damage on "History" questions.
- **Mage**: Can "Freeze" the timer on "Science" questions.
- **Rogue**: Steals extra gold on "Pop Culture" questions.
- **Cleric**: Heals the party on "Nature" questions.
Combat is turn-based: the monster asks a question, and the party must answer. Correct answers deal damage; wrong answers result in the party taking damage.

## Game Flow
1. **Lobby** → Players join and select their classes.
2. **The Map** → The party sees a branching path (e.g., "The Goblin Cave" vs "The Haunted Library"). They vote on which path to take.
3. **Encounters** → 
    - **Combat**: A monster appears. Multiple-choice questions are served to specific players or the whole group.
    - **Loot**: A chest appears. A rapid-fire "True/False" sequence determines how much gold is found.
    - **Rest**: Players can spend gold to buy "Potions" (hints) or "Armor" (extra health).
4. **The Boss** → A multi-stage encounter with a high-health enemy. Requires specific "Combo" answers (e.g., 3 players must answer correctly within 2 seconds).
5. **Victory/Defeat** → If the party health hits zero, the run ends. If the Boss dies, the party is showered in gold and XP.

## Scoring System
- **Gold**: Collected throughout the run; acts as the final score.
- **XP**: Earned for correct answers; levels up classes to unlock stronger abilities.
- **Damage Dealt**: Individual leaderboard for "Most Valuable Player."
- **Survival Bonus**: Multiplier for finishing with all party members alive.

## Content Requirements
- **Monster Bestiary**: 30+ unique monsters with different question "affinities" (e.g., a Fire Elemental only asks about Science/Chemistry).
- **Dungeon Rooms**: 50+ unique encounter types (traps, shops, shrines).
- **RPG Items**: 20+ items that modify trivia gameplay (e.g., "Scroll of Wisdom" removes two wrong answers).

## Technical Implementation
### Template Changes
- **RPG Combat UI**: A main screen that displays health bars, status effects, and animated monster sprites.
- **Inventory/Shop UI**: A mobile interface for managing items and gold between encounters.

### New Infrastructure
- **Persistent Run-State RPG Framework**: 
    - **Stateful Session**: Unlike other games that reset each round, Trivia Quest needs a "Run State" that tracks party health, inventory, and map progress across 10-15 encounters.
    - **Class/Ability System**: A modular system to define how different player roles interact with the trivia engine (e.g., modifying timers, damage multipliers, or UI visibility).
    - **Procedural Dungeon Generator**: A logic layer that builds a balanced path of encounters based on the current party strength and player count.
- **Combat Resolver**: A specialized engine that translates trivia results (correct/wrong/time) into RPG values (damage/healing/status effects).

### Input Types Used
- **Multiple Choice**: Standard 4-button input.
- **Ability Trigger**: A "Limit Break" button that appears when a meter is filled.
- **Map Navigation**: Voting on branching paths.

### Estimated Phases
- `LOBBY`
- `CLASS_SELECTION`
- `MAP_NAVIGATION`
- `COMBAT_INTRO`
- `QUESTION_ACTIVE`
- `COMBAT_RESOLUTION`
- `SHOP_INTERMISSION`
- `BOSS_FINALE`
- `RESULTS`

## Dependencies
- **Wave 4 Real-time Sync**: For health bar updates and ability triggers.
- **Wave 3 Content API**: For fetching categorized trivia questions.

## Design Notes
Trivia Quest is the "heavyweight" of Wave 5. It transforms trivia from a static quiz into a dynamic adventure. The infrastructure (Persistent Run-State) is a major leap forward, allowing for "Campaign" style games in the future. It justifies the engineering cost by providing a highly replayable, deep experience that appeals to both trivia buffs and RPG fans. The primary risk is balancing—ensuring that a few wrong answers don't end the game too quickly, which would be frustrating for a party.
