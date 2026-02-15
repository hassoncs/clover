# Midnight Match

> **Wave**: 4 | **Tier**: 4 | **Effort**: L | **Players**: 3-12
> **Category**: Social Dating / Deduction

## Concept
A supernatural speed-dating app where everyone is a monster looking for love (or points). Players chat privately to find a compatible partner, but every monster has a hidden agenda or power that can steal points, curse their date, or reveal secrets.

## Core Mechanic
Private messaging and mutual selection. The game revolves around "Chat Phases" where players can send direct messages to any other player. At the end of the night, everyone picks one person to "Match" with. If the selection is mutual, both score big. If not, the "Monster Powers" determine the fallout.

## Game Flow
1. **Lobby** → Players join and receive a random "Monster Identity" (e.g., Vampire, Ghost, Werewolf, Zombie).
2. **Profile Setup** → Players answer 3 quirky prompts to build their "Dating Profile" (e.g., "My ideal first date is...", "I'm looking for someone who...").
3. **The Night (Rounds 1-3)** → 
    - **Chat Phase**: 90 seconds of unrestricted private messaging. Players can jump between conversations.
    - **Selection**: Players privately choose who they want to "Match" with for that round.
    - **The Reveal**: The main screen shows who matched, but not the monster powers yet.
4. **The Witching Hour (Finale)** → A final, longer chat phase where "Monster Powers" are fully active and can be used to swap matches or double points.
5. **Sunrise** → Final scores are revealed, along with the "Most Desirable Monster" and "Heartbreaker" awards.

## Scoring System
- **Mutual Match**: +500 points for both players.
- **One-Sided Match**: +100 points for the person chosen (the "Heartbreaker"), 0 for the chooser.
- **Monster Power Bonuses**:
    - *Vampire*: Steals 200 points from their match.
    - *Ghost*: Can match with someone who didn't pick them, but only gets half points.
    - *Werewolf*: Gets double points if they match with another Werewolf.
    - *Zombie*: If they don't match, they "infect" the person they chose, losing them 300 points.
- **Leader Exposure**: The current leader's monster identity is revealed to everyone at the start of Round 3.

## Content Requirements
- **Monster Identities**: 15+ unique roles with distinct scoring modifiers.
- **Profile Prompts**: 100+ funny, supernatural-themed icebreakers.
- **Chat Stickers**: Custom monster-themed emojis for quick reactions.

## Technical Implementation
### Template Changes
- **DM Interface**: A dedicated UI for managing multiple concurrent private chat threads on mobile.
- **Profile Gallery**: A swipeable or grid-based view of other players' profiles.

### New Infrastructure
- **Secure Private DM Channels**: A robust WebSocket-based messaging system that ensures messages are only delivered to the intended recipient and the server (for logging/moderation).
- **Hidden Power Engine**: A logic layer that calculates scores based on the complex interaction of 12+ different monster rules at the end of each round.
- **Dynamic Reveal System**: A main-screen animation sequence that builds tension by revealing matches and power effects one by one.

### Input Types Used
- **Text Input**: For DMs and profile setup.
- **Selection Grid**: For choosing a match.
- **Power Trigger**: A special button to activate monster abilities.

### Estimated Phases
- `LOBBY`
- `PROFILE_SETUP`
- `NIGHT_CHAT` (Looping)
- `MATCH_SELECTION`
- `POWER_REVEAL`
- `WITCHING_HOUR`
- `FINAL_RESULTS`

## Dependencies
- **Wave 3 Private Messaging**: Essential for the core loop.
- **Wave 4 Real-time State**: Needed for the "Power Trigger" to affect other players' states instantly.

## Design Notes
Midnight Match is a "social engine" game. It relies on player interaction rather than trivia or drawing. The technical challenge is the "Hidden Power Engine"—ensuring that the interaction of powers (e.g., a Vampire matching with a Zombie) is consistent and fair. This game builds the infrastructure for any future "Secret Role" or "Social Deduction" games where private communication is key.
