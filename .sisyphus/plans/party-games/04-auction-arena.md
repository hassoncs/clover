# Vault of Vanities

> **Wave**: 4 | **Tier**: 4 | **Effort**: XL | **Players**: 3–8
> **Category**: Economy / Auction

## Concept
Players are eccentric collectors at an underground auction for "Cursed Artifacts." You must buy low, sell high, and avoid being crushed by predatory loans from the "Shadow Bank."

## Core Mechanic
Players draw "Artifacts" based on secret, weird categories. These are then auctioned off. However, each player receives "Valuation Tips" about certain categories (e.g., "Clockwork items are trending!"). You must bid on items you think are valuable, even if you didn't draw them.

## Game Flow
1. **Lobby** → Players receive their starting "Soul Capital" ($5,000).
2. **Creation Phase** → Everyone draws an artifact for a secret category (e.g., "A Haunted Toaster").
3. **The Auction** → Items are presented one by one. Bidding is "Blind" (you submit your max bid, and the highest wins at the second-highest price + $100).
4. **The Twist** → If you run out of money, you are forced to take a "Predatory Loan" with 50% interest per round.
5. **Finale: The Liquidation** → Artifact values are revealed based on the "Tips." Net worth (Cash + Artifact Value - Debt) determines the winner.

## Scoring System
- **Profit Margin**: (Final Value - Purchase Price).
- **Artist Royalty**: The artist gets 10% of the final auction price.
- **Debt Penalty**: -1000 points for every active loan.
- **Collection Bonus**: Owning 3 artifacts of the same "Theme" doubles their value.

## Content Requirements
- 300+ Artifact Categories.
- 100+ Valuation Tips (e.g., "The Duke loves anything with tentacles").

## Technical Implementation
### Template Changes
- `PlayerState`: Add `wallet`, `inventory`, and `loans` fields.
- `AuctionItem`: New entity type with `currentBid`, `bidHistory`, and `secretValue`.

### New Infrastructure
- **Auction Engine**: A stateful system to handle blind bids, timer-based increments, and "Going, Going, Gone" logic.
- **Economy Subsystem**: Handles transactions, interest calculations for loans, and "Net Worth" tracking.
- **Asymmetric Information Router**: Delivers different "Tips" to different players via the `GodotBridge`.

### Input Types Used
- `CurrencyInput`: For bidding.
- `Drawing`: For artifact creation.

### Estimated Phases
- `LOBBY`
- `DRAWING`
- `AUCTION_ROUND`
- `LOAN_PHASE`
- `REVEAL`
- `RESULTS`

## Dependencies
- `EconomyEngine` (New)
- `AuctionStateController` (New)

## Design Notes
- The "Predatory Loans" add a high-stakes "push your luck" element.
- Pitfall: One player getting too rich early. Solution: "Market Crashes" that target the wealthiest player.
- Uniqueness: Combining drawing with a complex economic simulation.
