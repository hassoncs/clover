# The Hive Mind

> **Wave**: 3 | **Tier**: 3 | **Effort**: M | **Players**: 2-10 (Even numbers preferred)
> **Category**: Social, Team-based, Prediction

## Concept
You are trapped in a psychic cavern. To escape, your team must predict the "Hive Mind"—the collective preferences of everyone in the room. If you can't read the room, you'll be stuck in the mines forever.

## Core Mechanic
Two teams. First, everyone privately ranks a list of 8 items (e.g., "Best Pizza Toppings"). Then, teams take turns trying to guess the items in order from "Most Popular" to "Least Popular."

## Game Flow
1. **Lobby** → Players are split into two teams: **The Diggers** and **The Drillers**.
2. **The Survey**: Everyone ranks 8 items on their phone.
3. **The Descent**:
    - Teams take turns picking an item they think is high on the list.
    - If they pick the #1 most popular, they advance.
    - If they pick a "Trap" (an item ranked low by the group), they lose a life.
4. **The Escape**: The first team to find the top 3 items (or the team that survives the longest) wins.

## Scoring System
- **Correct Prediction**: +1000 points.
- **Finding #1**: +2000 points.
- **Hitting a Trap**: 0 points and loss of team life.

## Content Requirements
- Content type: `RankingPoll` (New schema: `{ category: string, items: string[] }`).
- Volume needed: 50+ categories.
- Generation approach: AI-generated fun categories.

## Technical Implementation
### Template Changes
Requires a `ranking` input type where players can drag and drop items. The template needs to aggregate these rankings into a single "Master List" using a Borda count or similar algorithm.

### New Infrastructure
- **Team State**: Logic to handle team turns, shared lives, and collective decision-making (one player acts as "Captain" or majority vote).
- **Ranking UI**: Drag-and-drop list component for the phone.

### Input Types Used
- `choice` (Ranking): For the initial survey.
- `choice`: For the team's turn to pick an item.

### Estimated Phases
`lobby` → `survey` → `team_turns` → `reveal_list` → `winner`

## Dependencies
- Drag-and-drop UI component.
- Team management logic in `PartyRoomDO`.

## Design Notes
This is a "know your friends" game. It's less about facts and more about social intuition. The "Trap" items (the ones nobody liked) are often the funniest reveals.
