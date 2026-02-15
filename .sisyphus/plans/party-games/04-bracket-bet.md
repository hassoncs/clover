# The Grand Slop-Off (Bracket Bet)

> **Wave**: 4 | **Tier**: 4 | **Effort**: XL | **Players**: 3-16
> **Category**: Tournament Comedy / Betting

## Concept
A high-stakes tournament where players submit answers to ridiculous prompts, which are then seeded into a single-elimination bracket. Non-competing players (and spectators) bet on the outcomes of each matchup, with payouts based on the margin of victory.

## Core Mechanic
Players submit one "ultimate" answer to a prompt. These are paired off in a bracket. Before each matchup is revealed and voted on, all players place "Slop-Coins" on who they think will win. The betting system uses dynamic odds based on the "confidence" of the bets.

## Game Flow
1. **Lobby** → Players join, initial "Slop-Coin" balance assigned (1000 coins).
2. **Submission Phase** → Everyone gets the same prompt (e.g., "The worst thing to find in a sandwich").
3. **The Bracket Reveal** → The tournament tree is generated and displayed.
4. **Matchup Betting** → For the current matchup, players see the two names but NOT the answers yet. They place bets.
5. **The Reveal & Vote** → Answers are revealed. Everyone (including the two in the matchup) votes.
6. **Payouts** → Winners of the matchup advance. Bettors get paid based on (Bet * (WinnerVotes / TotalVotes)).
7. **Finale** → The Championship Match. Double stakes. The player with the most coins at the end wins the "Golden Slop-Bucket".

## Scoring System
- **Matchup Win**: 500 points (advances in bracket).
- **Betting Payout**: `Points = Bet Amount * (VotesForWinner / TotalVotes) * 2`.
- **Perfect Prediction**: +200 bonus if you bet on the winner and they get 100% of the votes.
- **Underdog Bonus**: If a player with fewer total coins wins a matchup, their bettors get a 1.5x multiplier.

## Content Requirements
- 200+ Tournament-style prompts (e.g., "The most useless superpower", "The best name for a pet rock").
- AI-generated bracket commentary (text-to-speech).

## Technical Implementation
### Template Changes
- `bracket-bet.ts`: Extends `PartyTemplateRunner` with a recursive bracket state.
- Support for up to 16 players (requires UI scaling for the bracket tree).

### New Infrastructure
- **Bracket Engine**: A stateful manager that handles seeding (random or skill-based), advancement, and "bye" rounds for odd player counts.
- **Betting System**: A transaction-based ledger for "Slop-Coins". Must handle concurrent bet placement and atomic payouts.
- **Dynamic Odds**: Real-time calculation of potential payouts based on current betting pool.

### Input Types Used
- `text`: For the initial prompt answer.
- `choice`: For voting on matchups.
- `slider/number`: For placing bet amounts.

### Estimated Phases
- `Lobby`
- `Answering`
- `BracketReveal`
- `Betting` (Loop per matchup)
- `Voting` (Loop per matchup)
- `Reveal` (Loop per matchup)
- `Winner`

## Dependencies
- `PartyRoomDO` update to support persistent "currency" across phases.
- Bracket UI component for the game board.

## Design Notes
- **Fun Factor**: High tension during the reveal after betting big.
- **Balance**: Ensure players who lose early in the bracket can still win the game via savvy betting.
- **Pitfalls**: Long brackets can be slow; need to keep the reveal/voting snappy.
