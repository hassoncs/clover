# Data Breach Detective

> **Wave**: 4 | **Tier**: 4 | **Effort**: XL | **Players**: 4–8
> **Category**: Deduction / Survey

## Concept
A massive corporate survey has been leaked. One of the players is a "Corporate Spy" who committed a crime. The other players must use the survey data (which everyone filled out at the start) as evidence to find the culprit.

## Core Mechanic
Survey Evidence Graph. At the start of the game, everyone answers 10 weird personal questions (e.g., "How many tabs do you have open right now?"). These answers become the "Database." The Spy's answers are the "Clues" left at the crime scene.

## Game Flow
1. **Lobby** → The "Pre-Game Survey." 10 rapid-fire questions.
2. **The Crime** → A scenario is described (e.g., "Someone stole the CEO's golden stapler").
3. **Evidence Reveal** → Three "Clues" are revealed from the database (e.g., "The thief has more than 50 tabs open").
4. **Interrogation** → Players are paired up to "Cross-Examine" each other. You can see your partner's survey answers and must find inconsistencies.
5. **The Trial** → Each player presents their "Case" against someone else.
6. **Finale: The Verdict** → A final vote. If the Spy is caught, the Detectives win.

## Scoring System
- **Spy Stealth**: Points for every player who voted for an innocent person.
- **Detective Logic**: Points for correctly linking a Clue to a player's survey answer.
- **Consistency Bonus**: Points for innocent players whose survey answers remained consistent during interrogation.
- **Trial Performance**: Audience votes on the "Most Convincing" accusation.

## Content Requirements
- 500+ Survey Questions (Quantitative and Qualitative).
- 100+ Crime Scenarios.

## Technical Implementation
### Template Changes
- `SurveyData`: A new data structure to store and query player responses.
- `EvidenceClue`: An entity that links a "Crime Requirement" to a "Survey Answer."

### New Infrastructure
- **Survey Evidence Graph**: A relational database (in-memory for the session) that allows the game engine to find "Outliers" or "Matches" among player answers to generate clues.
- **Interrogation Phase Controller**: Manages 1-on-1 private UI states where players see specific subsets of data.
- **Trial Phase UI**: A "Presentation Mode" where a player's device becomes a "Evidence Board" they can use to highlight clues.

### Input Types Used
- `SurveyInput`: Multi-choice and slider inputs.
- `EvidenceHighlight`: Selecting data points to build an accusation.

### Estimated Phases
- `LOBBY`
- `SURVEY_PHASE`
- `CRIME_REVEAL`
- `EVIDENCE_PHASE`
- `INTERROGATION`
- `TRIAL`
- `VOTING`
- `RESULTS`

## Dependencies
- `SurveyQueryEngine` (New)
- `EvidenceGraphSystem` (New)

## Design Notes
- Using the players' *actual* habits/answers makes the deduction feel personal and hilarious.
- Pitfall: Players lying on the survey. Solution: The Spy *must* lie, but innocent players are rewarded for being honest (verified by "Trap Questions").
