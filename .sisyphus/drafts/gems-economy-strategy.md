# Draft: Gems Economy Strategy Documentation

## Requirements (confirmed)

- **Scope**: New strategic thinking defining the evolution of the economy
- **Currencies**: Cover entire system (Sparks + Gems) and their interplay
- **Audience**: Both product vision AND technical implementation guide
- **Location**: `docs/economy/STRATEGY.md` (new directory)
- **Linking**: From `LAUNCH_ROADMAP.md` and `docs/INDEX.md`
- **Content**: Draft detailed content based on user's core ideas, adding Slopcade-specific depth

## Core Content Areas (from user prompt)

### 1. Three Broad Approaches
- **Play & Participation First**: Earn through playing/engagement
- **Creator-Centered Rewards**: Earn through creating content others enjoy
- **Status & Customization**: Spend on cosmetics/social features

### 2. Hybrid Design Recommendation
- **Play-First**: Primary earning mechanism
- **Social Customization**: Primary spending sink
- **Creator Recognition**: Long-term engagement loop

### 3. Implementation Phases
- **Launch**: Initial economy state
- **Phase 1**: First expansion
- **Phase 2**: Creator features
- **Phase 3**: Full hybrid model

### 4. Safety Notes for Kids Platforms
- COPPA compliance considerations
- Parental controls
- No gambling mechanics
- Transparent value communication

## Technical Context (discovered)

### Existing Implementation
- **Sparks (soft)**: 1000 micros = 1 Spark, used for AI generation
- **Gems (hard)**: gem-service.ts exists, separate from Sparks
- **Wallets**: Full transaction history, idempotent operations
- **IAP**: 3 Spark packs defined ($0.99, $4.99, $19.99)
- **Codes**: Signup codes (1000 Sparks) and promo codes working

### Current Pricing
- Asset entity: 40 Sparks ($0.04 user cost)
- Asset background: 40 Sparks
- Full game reskin: 100 Sparks or 10 Gems
- Signup grant: 1000 Sparks (~25 assets)

### Key Files
- `api/src/economy/wallet-service.ts` - Spark wallet operations
- `api/src/economy/gem-service.ts` - Gem wallet operations
- `api/src/economy/pricing.ts` - Cost constants and IAP products
- `shared/src/schema/economy.ts` - Database schemas
- `api/src/trpc/routes/economy.ts` - API endpoints
- `docs/LAUNCH_ROADMAP.md` - Brief Section 3 to link from

## Document Structure (proposed)

```
docs/economy/
├── INDEX.md           # Hub page linking to all economy docs
└── STRATEGY.md        # Main strategy document
```

### STRATEGY.md Sections
1. Executive Summary
2. Currency System Overview (Sparks + Gems roles)
3. Three Strategic Approaches (detailed analysis)
4. Recommended Hybrid Model
5. Implementation Phases with Technical Details
6. Safety & Compliance (Kids Platform Considerations)
7. Success Metrics
8. Appendix: Current Implementation Reference

## Open Questions
- None remaining - all clarified by user

## Scope Boundaries
- **INCLUDE**: Strategy document, INDEX.md for economy folder, linking updates
- **EXCLUDE**: Code changes, UI mockups (separate task), IAP integration details

## Delegation Recommendation
- **Category**: `standard` (documentation with some research)
- **Skills**: None required (standard documentation)
- **Agent**: Primary agent can handle this directly
- **Alternative**: If user wants rich visual/UI flow drafts, use `frontend-ui-ux` skill
