# The Personality Profiler

> **Wave**: 3 | **Tier**: 3 | **Effort**: M | **Players**: 3-8
> **Category**: Social, Personality, Matching

## Concept
You are a test subject in a futuristic social experiment. The "Super-Computer" wants to categorize your friend group into archetypes. Who is the "Chaos Gremlin"? Who is the "Secret Billionaire"? Vote, assign, and see how well you truly know each other.

## Core Mechanic
The group votes on a category (e.g., "Classic Horror Movie Monsters"). Then, each player must assign every other player in the room to one of the roles in that category (e.g., Dracula, Frankenstein, Wolfman). Points are awarded for matching the majority consensus.

## Game Flow
1. **Lobby** → Players enter their "Subject ID."
2. **Category Vote**: Players choose between three random categories.
3. **The Assignment**: Players see a list of their friends and a list of roles. They drag friends into roles.
4. **The Reveal**: One by one, roles are revealed. "Who did the group think was Dracula?"
5. **The 99% Bet**: Before a reveal, you can bet that you are *certain* of the outcome for a bonus.

## Scoring System
- **Consensus Match**: +500 points if your assignment matches the majority.
- **Majority Winner**: +1000 points if *you* were the one chosen for a role by the majority.
- **Confidence Bonus**: +1000 points if you used your "99% Sure" bet correctly.

## Content Requirements
- Content type: `PersonalityCategory` (New schema: `{ title: string, roles: string[] }`).
- Volume needed: 100+ categories.
- Generation approach: AI-generated archetypes and pop culture groups.

## Technical Implementation
### Template Changes
Needs a "Grid" or "Matching" input type where N players are mapped to M roles.

### New Infrastructure
- **Consensus Engine**: A utility to calculate the mode (most frequent) assignment for each role across all player inputs.
- **Betting System**: A "Double Down" mechanic for the assignment phase.

### Input Types Used
- `choice`: For category voting.
- `choice` (Matching): For assigning players to roles.

### Estimated Phases
`lobby` → `category_vote` → `assignment` → `reveal_roles` → `winner`

## Dependencies
- Matching UI component.
- Consensus calculation logic.

## Design Notes
The fun is in the "Why did you guys think I was the Mummy?" conversations. It's a lighthearted way to roast your friends based on their vibes.
