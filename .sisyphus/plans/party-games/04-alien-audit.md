# Mimic Manifest

> **Wave**: 4 | **Tier**: 4 | **Effort**: XL | **Players**: 4–10
> **Category**: Team Social Deduction

## Concept
A deep-space research station has been infiltrated by "Mimics." Humans must complete "Calibration Tasks" (drawing/writing) to prove they are biological, while Mimics receive slightly different prompts and must fake their way through.

## Core Mechanic
Asymmetric Prompt Routing. Humans might get the prompt "Draw a Birthday Cake," while Mimics get "Draw something with candles." The Mimic doesn't know the Human prompt, and vice versa. They must then perform "Activity-Based Testing" (Drawing, Writing, or Sorting).

## Game Flow
1. **Lobby** → Roles assigned: 70% Humans, 30% Mimics.
2. **The Test Phase** → Everyone performs a task.
   - *Drawing*: "Draw a tool used by a doctor." (Mimics get: "Draw something sharp.")
   - *Writing*: "Complete the sentence: 'The best part of breakfast is...'" (Mimics get: "Complete the sentence: 'Something crunchy is...'")
3. **The Audit** → All results are shown. Players discuss who seems "Off."
4. **The Hack** → Mimics can use a "Hack" ability to swap two players' prompts for the next round or blur someone's drawing.
5. **Finale: The Ejection** → A unanimous vote (excluding the accused) is required to eject a player. If a Human is ejected, the Mimics get closer to winning.

## Scoring System
- **Human Victory**: Eject all Mimics.
- **Mimic Victory**: Outnumber Humans or survive 3 rounds.
- **Task Accuracy**: Points for Humans who correctly identify the Mimic's "Asymmetric Prompt."
- **Deception Bonus**: Points for Mimics who receive "Human Votes" for having the "Best" drawing.

## Content Requirements
- 500+ Asymmetric Prompt Pairs (Human vs. Mimic versions).
- 50+ "Hack" abilities.

## Technical Implementation
### Template Changes
- `GameDefinition`: Add `roleConfig` and `promptGroups`.
- `Player`: Add `role` (Human/Mimic) and `currentPromptId`.

### New Infrastructure
- **Team Hidden-Role Engine**: Manages secret assignments and ensures Mimics can see who their teammates are.
- **Asymmetric Prompt Router**: A logic layer that selects and delivers different strings to players based on their `role` property.
- **Unanimous Vote Controller**: A specialized voting system that requires a specific threshold (e.g., N-1) and handles "Tie-Breakers" via a mini-game.

### Input Types Used
- `SecretPromptInput`: Input based on hidden instructions.
- `DiscussionUI`: Integrated chat/timer for the Audit phase.

### Estimated Phases
- `LOBBY`
- `ROLE_REVEAL`
- `TEST_PHASE`
- `AUDIT_PHASE`
- `HACK_PHASE`
- `VOTING`
- `RESULTS`

## Dependencies
- `RoleManagementSystem` (New)
- `AsymmetricPromptSystem` (New)

## Design Notes
- The "Hack" abilities give Mimics a way to fight back if they are being caught.
- Pitfall: Prompts being too similar or too different. Solution: Extensive playtesting of the "Prompt Pairs" to ensure the "Overlap" is just right.
