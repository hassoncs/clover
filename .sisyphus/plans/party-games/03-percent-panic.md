# The Statistician's Secret

> **Wave**: 3 | **Tier**: 3 | **Effort**: L | **Players**: 3-8
> **Category**: Trivia, Estimation, Betting

## Concept
You are an undercover agent for the "Bureau of Human Behavior." Your mission: predict the weird habits of the general population. How many people actually wash their feet in the shower? Guess the percentage, and bet on your friends' intuition.

## Core Mechanic
One player (The Agent) is given a survey result (e.g., "What percentage of people have lied about their age?"). They guess the percentage (0-100). Everyone else then guesses if the actual number is "Higher" or "Lower" than the Agent's guess, and by how much.

## Game Flow
1. **Lobby** → Players choose their "Agent Code Name."
2. **The Mission**:
    - The Agent submits their percentage guess.
    - Others see the Agent's guess and choose "Higher" or "Lower."
    - Others also place a "Confidence Bet" (1-3 stars).
3. **The Reveal**: The actual percentage is revealed.
4. **The Finale**: A multi-select question where everyone guesses which of 3 stats is the highest.

## Scoring System
- **Agent Proximity**: Up to 1000 points based on how close they were to the truth.
- **Guesser Points**: +500 for correct Higher/Lower.
- **Betting Multiplier**: Correct Higher/Lower points are multiplied by your star bet (1x, 2x, 3x).

## Content Requirements
- Content type: `EstimationQuestion` (Schema: `{ question: string, percentage: number, source: string }`).
- Volume needed: 100+ survey questions.
- Generation approach: Real-world survey data (Pew Research, etc.) or AI-simulated surveys.

## Technical Implementation
### Template Changes
Needs a slider for the Agent and a "Higher/Lower" toggle for the Guessers.

### New Infrastructure
- **Percentage Reveal Animation**: A visual "filling" bar that stops at the actual number.
- **Betting UI**: A simple star-rating component for the phone.

### Input Types Used
- `choice` (Slider): For the Agent's guess.
- `choice`: For Higher/Lower and Betting.

### Estimated Phases
`lobby` → `agent_guess` → `group_bet` → `reveal` → `winner`

## Dependencies
- `EstimationQuestion` content.
- Slider and Betting UI components.

## Design Notes
This game works because people have very different ideas about what is "normal." The "Higher/Lower" mechanic keeps everyone involved even when it's not their turn to be the Agent.
