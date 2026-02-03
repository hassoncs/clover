# Gems Economy Strategy Documentation

## Context

### Original Request
Create a comprehensive strategic design document for the Slopcade "Gems" economy covering:
1. Three Broad Approaches (Play & Participation, Creator-Centered, Status & Customization)
2. Hybrid Design Recommendation (Play-First + Social Customization + Creator Recognition)
3. Implementation Phases (Launch through Phase 3)
4. Safety Notes for Kids Platforms

### Interview Summary
**Key Discussions**:
- **Scope**: New strategic thinking defining economy evolution, not just documenting existing code
- **Audience**: Dual-purpose - product vision AND technical implementation guide
- **Location**: New `docs/economy/` directory with STRATEGY.md as main document
- **Currency Coverage**: Entire system (Sparks + Gems interplay in hybrid model)
- **Content Depth**: AI-drafted with Slopcade-specific implementation details

**Research Findings**:
- Existing implementation: Sparks (soft, AI generation), Gems (hard, premium)
- Full economy stack exists: wallet-service, gem-service, pricing, IAP products
- LAUNCH_ROADMAP.md Section 3 has brief monetization mention (to be linked)
- No dedicated economy strategy document exists today

### Self-Review Gap Analysis

**Potential Gaps Identified:**
1. **Gem earning mechanics** - code exists for spending, but how do users EARN Gems in hybrid model?
2. **Creator reward distribution** - what triggers creator payouts? Views? Remixes? Downloads?
3. **Conversion mechanics** - can Sparks convert to Gems or vice versa?
4. **Daily rewards** - LAUNCH_ROADMAP mentions daily Sparks, but current code disables it
5. **Social features** - what customization options exist to spend on?

**Guardrails Applied:**
- Document must acknowledge existing implementation, not contradict it
- Technical sections must reference actual file paths for implementers
- Safety section must address real COPPA requirements, not generic advice
- Phases must be realistic given 8-week launch timeline in LAUNCH_ROADMAP

---

## Work Objectives

### Core Objective
Create the authoritative Gems Economy strategy document that serves as both product vision and technical implementation guide, defining how Sparks and Gems work together in Slopcade's hybrid economy model.

### Concrete Deliverables
1. `docs/economy/INDEX.md` - Hub page for economy documentation
2. `docs/economy/STRATEGY.md` - Main strategy document (~1500-2500 words)
3. Updated `docs/INDEX.md` - Add economy section
4. Updated `docs/LAUNCH_ROADMAP.md` - Link to STRATEGY.md from Section 3

### Definition of Done
- [ ] All four files created/updated
- [ ] STRATEGY.md contains all required sections with substantive content
- [ ] Technical references point to real files in codebase
- [ ] Links work bidirectionally (INDEX → economy, economy → INDEX)
- [ ] Document passes spell check and markdown lint

### Must Have
- Three Approaches analysis with pros/cons for each
- Hybrid Model recommendation with clear rationale
- Implementation Phases with concrete milestones
- Safety Notes section addressing COPPA/kids concerns
- References to existing code (pricing.ts, wallet-service.ts, etc.)
- Success metrics for economy health

### Must NOT Have (Guardrails)
- Code changes or new features (documentation only)
- UI mockups or design specs (separate task)
- Specific dollar amounts for future IAP products (strategy, not pricing)
- RevenueCat integration details (out of scope)
- Promises of specific features without "proposed" qualifier
- Gambling-adjacent mechanics (loot boxes, chance-based rewards)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: N/A (documentation task)
- **User wants tests**: Manual-only
- **Framework**: N/A

### Manual QA Procedures

**Document Verification:**
- [ ] All markdown files render correctly in VS Code preview
- [ ] All internal links resolve (no 404s)
- [ ] Code file references exist in codebase
- [ ] Document reads coherently from start to finish
- [ ] Technical and product audiences can both extract value

---

## Task Flow

```
Task 1 (economy/INDEX.md)
    ↓
Task 2 (economy/STRATEGY.md) ← depends on INDEX existing
    ↓
Task 3 (docs/INDEX.md update) ← depends on economy/ existing
Task 4 (LAUNCH_ROADMAP.md update) ← can parallel with Task 3
    ↓
Task 5 (Final review & commit)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 3, 4 | Independent file updates after economy/ created |

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | STRATEGY.md links to INDEX.md |
| 3, 4 | 2 | External docs link to completed STRATEGY.md |
| 5 | 3, 4 | Commit only after all files ready |

---

## TODOs

- [ ] 1. Create `docs/economy/INDEX.md` (Hub Page)

  **What to do**:
  - Create `docs/economy/` directory
  - Create INDEX.md as the hub for economy documentation
  - Include sections for: Overview, Strategy, Technical Reference, Future Docs
  - Link to STRATEGY.md (will exist after Task 2)
  - Add brief description of Sparks vs Gems roles

  **Must NOT do**:
  - Include actual strategy content (that goes in STRATEGY.md)
  - Make up future document names that aren't planned

  **Parallelizable**: NO (must complete first)

  **References**:
  - `docs/game-maker/INDEX.md` - Pattern for INDEX page structure
  - `docs/gallery-system/INDEX.md` - Alternative INDEX pattern with status badges

  **Acceptance Criteria**:
  - [ ] File exists at `docs/economy/INDEX.md`
  - [ ] Contains navigation table pointing to STRATEGY.md
  - [ ] Follows existing INDEX.md patterns in codebase
  - [ ] Renders correctly in markdown preview

  **Commit**: NO (groups with Task 5)

---

- [ ] 2. Create `docs/economy/STRATEGY.md` (Main Strategy Document)

  **What to do**:
  - Write comprehensive strategy document with these sections:
  
  ```markdown
  # Slopcade Economy Strategy
  
  ## Executive Summary
  [Brief overview: Sparks for utility, Gems for social/premium, hybrid model]
  
  ## Currency System Overview
  ### Sparks (⚡) - Utility Currency
  [Role: AI generation fuel, earned through play, prevents abuse]
  
  ### Gems (💎) - Premium Currency  
  [Role: Social features, customization, creator rewards]
  
  ### Interplay
  [How they work together, no direct conversion]
  
  ## Three Strategic Approaches
  
  ### Approach 1: Play & Participation First
  [Analysis: Users earn by playing games]
  - Pros: Low barrier, engagement-driven
  - Cons: Inflation risk, bots
  - Examples: Duolingo gems, game daily rewards
  
  ### Approach 2: Creator-Centered Rewards
  [Analysis: Users earn by making content others enjoy]
  - Pros: Quality content incentive, community growth
  - Cons: Rich-get-richer, barrier for new creators
  - Examples: Roblox DevEx, YouTube monetization
  
  ### Approach 3: Status & Customization
  [Analysis: Spend currency on cosmetics/social features]
  - Pros: Non-pay-to-win, identity expression
  - Cons: Requires social features to exist
  - Examples: Fortnite skins, Discord Nitro
  
  ## Recommended Hybrid Model
  
  ### Why Hybrid?
  [Rationale for combining approaches]
  
  ### Slopcade's Formula
  - **Earn (Sparks)**: Play games → earn Sparks → fuel AI generation
  - **Earn (Gems)**: Create popular games → earn Gems from engagement
  - **Spend (Sparks)**: AI asset generation, game reskins
  - **Spend (Gems)**: Profile customization, premium templates, creator tips
  
  ### Balance Mechanisms
  [How we prevent inflation/deflation]
  
  ## Implementation Phases
  
  ### Current State (Pre-Launch)
  [What exists today: Sparks wallet, Gem service, IAP products]
  - Reference: `api/src/economy/pricing.ts`
  
  ### Launch Phase
  [MVP economy: Sparks for generation, IAP for Sparks, signup grants]
  - Timeline: Weeks 1-2 of launch
  - Features: Basic wallet, IAP integration
  
  ### Phase 1: Play Rewards
  [Add earning through gameplay]
  - Timeline: Month 2
  - Features: Daily login Sparks, achievement Sparks
  
  ### Phase 2: Creator Features
  [Add creator earning mechanics]
  - Timeline: Month 3-4
  - Features: Remix tracking, creator Gem payouts
  
  ### Phase 3: Social Economy
  [Full hybrid with customization]
  - Timeline: Month 5+
  - Features: Profile customization, Gem store, tipping
  
  ## Safety & Compliance
  
  ### COPPA Considerations
  [Ages 6-14 target audience requirements]
  - No real-money gambling mechanics
  - Clear value communication
  - Parental spending controls
  
  ### Dark Pattern Avoidance
  [What we explicitly won't do]
  - No artificial scarcity pressure
  - No pay-to-win mechanics
  - No obscured conversion rates
  
  ### Transparency Requirements
  [How we communicate value]
  - Clear Spark/Gem costs displayed
  - Purchase confirmation for all IAP
  - Spending history visible
  
  ## Success Metrics
  
  ### Economy Health Indicators
  - Spark velocity (earned vs spent per user)
  - Gem conversion rate (% of users who purchase)
  - Creator payout ratio (Gems to creators vs platform)
  
  ### Target Benchmarks
  [From LAUNCH_ROADMAP]
  - 3% Gem conversion covers AI generation costs
  - Day 2 retention from Daily Sparks: 30%+
  
  ## Appendix: Technical Reference
  
  ### Key Files
  | File | Purpose |
  |------|---------|
  | `api/src/economy/wallet-service.ts` | Spark wallet operations |
  | `api/src/economy/gem-service.ts` | Gem wallet operations |
  | `api/src/economy/pricing.ts` | Cost constants, IAP catalog |
  | `shared/src/schema/economy.ts` | Database schemas |
  | `api/src/trpc/routes/economy.ts` | API endpoints |
  
  ### Database Tables
  - `user_wallets` - Spark balances (Drizzle schema defined)
  - `user_gems` - Gem balances (used in gem-service.ts, NOT in Drizzle schema - raw SQL)
  - `credit_transactions` - All transaction history
  - `iap_products` / `iap_purchases` - IAP tracking
  
  > **Note**: The gem-service.ts uses raw SQL for user_gems table. 
  > Consider adding to Drizzle schema in future work.
  ```

  **Must NOT do**:
  - Promise specific features as "will happen" vs "proposed"
  - Include gambling-adjacent mechanics
  - Contradict existing implementation
  - Make up metrics without "target" qualifier

  **Parallelizable**: NO (depends on Task 1, blocks Tasks 3-4)

  **References**:
  - `api/src/economy/pricing.ts:1-110` - Current pricing model and IAP products
  - `api/src/economy/wallet-service.ts:62-100` - Wallet operations pattern
  - `api/src/economy/gem-service.ts:51-120` - Gem service pattern
  - `shared/src/schema/economy.ts:1-198` - Full database schema
  - `docs/LAUNCH_ROADMAP.md:23-40` - Existing economy brief (Section 3)
  - `docs/game-maker/INDEX.md` - Target audience reference (ages 6-14)

  **Acceptance Criteria**:
  - [ ] File exists at `docs/economy/STRATEGY.md`
  - [ ] Contains ALL sections from outline above
  - [ ] Each section has substantive content (not placeholders)
  - [ ] Technical references point to real files
  - [ ] Reads coherently for both product and engineering audiences
  - [ ] No gambling mechanics or dark patterns proposed
  - [ ] Phases align with LAUNCH_ROADMAP timeline

  **Commit**: NO (groups with Task 5)

---

- [ ] 3. Update `docs/INDEX.md` (Add Economy Section)

  **What to do**:
  - Add new section in Quick Navigation table for Economy
  - Add Economy subsection in documentation structure
  - Link to `docs/economy/INDEX.md`

  **Must NOT do**:
  - Reorganize existing sections
  - Change formatting of unrelated content

  **Parallelizable**: YES (with Task 4)

  **References**:
  - `docs/INDEX.md:1-103` - Current structure (add Economy section similar to Game Maker)

  **Acceptance Criteria**:
  - [ ] Economy appears in Quick Navigation table
  - [ ] Link to `economy/INDEX.md` works
  - [ ] Formatting matches existing sections

  **Commit**: NO (groups with Task 5)

---

- [ ] 4. Update `docs/LAUNCH_ROADMAP.md` (Link from Section 3)

  **What to do**:
  - Add link from Section 3 "Monetization & Credits" to economy/STRATEGY.md
  - Add brief note: "See [Economy Strategy](economy/STRATEGY.md) for full design"
  - Keep existing content intact

  **Must NOT do**:
  - Rewrite Section 3 content
  - Change other sections of LAUNCH_ROADMAP

  **Parallelizable**: YES (with Task 3)

  **References**:
  - `docs/LAUNCH_ROADMAP.md:22-40` - Section 3 to update

  **Acceptance Criteria**:
  - [ ] Link added to Section 3
  - [ ] Link resolves correctly
  - [ ] Existing content unchanged

  **Commit**: NO (groups with Task 5)

---

- [ ] 5. Final Review and Commit

  **What to do**:
  - Verify all links work bidirectionally
  - Run markdown lint if available
  - Spell check all new content
  - Create single commit with all files

  **Must NOT do**:
  - Split into multiple commits
  - Push to remote (user will decide)

  **Parallelizable**: NO (final task)

  **References**:
  - All files from Tasks 1-4

  **Acceptance Criteria**:
  - [ ] All internal links resolve
  - [ ] No spelling errors in new content
  - [ ] Markdown renders correctly
  - [ ] Single atomic commit created

  **Commit**: YES
  - Message: `docs(economy): add comprehensive gems economy strategy document`
  - Files: 
    - `docs/economy/INDEX.md` (new)
    - `docs/economy/STRATEGY.md` (new)
    - `docs/INDEX.md` (modified)
    - `docs/LAUNCH_ROADMAP.md` (modified)
  - Pre-commit: Manual review of rendered markdown

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 5 | `docs(economy): add comprehensive gems economy strategy document` | 4 files | Links resolve, markdown renders |

---

## Success Criteria

### Verification Commands
```bash
# Check files exist
ls docs/economy/INDEX.md docs/economy/STRATEGY.md

# Verify links (manual - check in VS Code preview)
# Open docs/INDEX.md → click Economy link
# Open docs/LAUNCH_ROADMAP.md → click economy/STRATEGY.md link
# Open docs/economy/STRATEGY.md → verify code file references exist
```

### Final Checklist
- [ ] All "Must Have" sections present in STRATEGY.md
- [ ] All "Must NOT Have" items absent (no gambling, no code changes)
- [ ] Links work bidirectionally
- [ ] Document serves dual audience (product + technical)
- [ ] Safety section addresses COPPA for ages 6-14
