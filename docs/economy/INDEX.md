# Economy & Monetization

Documentation and strategy for the Slopcade virtual economy.

## Contents

- [**Gems Economy Strategy**](./STRATEGY.md)  
  Comprehensive strategy for soft and hard currencies, creator incentives, and social prestige.

## Currency Overview

| Currency | Symbol | Role | Primary Acquisition |
|----------|--------|------|---------------------|
| **Sparks** | ⚡ | Utility | Daily login, playing, small achievements |
| **Gems** | 💎 | Premium/Social | IAP, creator milestones, rare events |

## Technical Implementation

- `api/src/economy/wallet-service.ts`: Core wallet and transaction logic.
- `api/src/economy/gem-service.ts`: Hard currency specific operations.
- `api/src/economy/pricing.ts`: Dynamic cost estimation for AI assets.
- `shared/src/schema/economy.ts`: Database definitions for wallets and transactions.
