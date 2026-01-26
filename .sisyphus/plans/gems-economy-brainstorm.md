# Gems Economy Design - Comprehensive Brainstorm

**Created**: 2026-01-26  
**Status**: BRAINSTORM - For review with other agents  
**Purpose**: Design the soft currency (Gems) system for Slopcade

---

## Executive Summary

Slopcade has a dual-currency model:

| Currency | Type | Source | Purpose |
|----------|------|--------|---------|
| **Sparks** ⚡ | Hard | IAP / Codes | AI generation costs (real money equivalent) |
| **Gems** 💎 | Soft | Gameplay / Engagement | Retention, cosmetics, social features |

This document explores design options for the Gems economy. The goal is to create a system that:
1. **Drives retention** - Gives players reasons to come back daily
2. **Rewards creators** - Incentivizes making good games
3. **Creates social value** - Makes profiles and cosmetics matter
4. **Optionally monetizes** - Can be purchased but doesn't have to be

---

## Part 1: What Do You SPEND Gems On?

### Option A: Profile Cosmetics (RECOMMENDED)

Leverage Slopcade's AI generation capabilities to let users customize their profiles.

| Cosmetic Type | Description | Cost Range | AI Generation? |
|---------------|-------------|------------|----------------|
| **Avatar Frame** | Decorative border around profile pic | 50-500 💎 | Yes (Scenario.com) |
| **Profile Background** | Background image on profile page | 100-1000 💎 | Yes |
| **Username Effects** | Animated/styled username | 200-2000 💎 | No (CSS effects) |
| **Achievement Badges** | Display earned accomplishments | 25-100 💎 | Partial |
| **Emoji Pack** | Custom emojis for comments/reactions | 500-2000 💎 | Yes |

**How AI-generated cosmetics work:**
1. User picks a cosmetic type (e.g., "Avatar Frame")
2. User enters a prompt ("cyberpunk neon frame", "medieval stone border")
3. System generates with Scenario.com
4. User pays Gems to "mint" it to their profile
5. Cosmetics are unique per-user (not tradeable initially)

**Pros:**
- Leverages existing AI infrastructure
- Infinite variety (no pre-made assets needed)
- Personal expression
- "Surprise and delight" moments

**Cons:**
- Generation costs us real money (but offset by Gem pricing)
- Quality variance in generations
- Need moderation for inappropriate content

---

### Option B: Game Play Tokens (Arcade Model)

Playing other people's games costs Gems, creating an arcade-like economy.

| Mechanic | Description | Example |
|----------|-------------|---------|
| **Free Plays** | X free plays per day | 5 free plays/day |
| **Play Cost** | Each additional play costs Gems | 1-5 💎 per play |
| **Creator Cut** | Creator earns % of play cost | 50% to creator |
| **Premium Games** | Creators can set higher prices | 10-50 💎 per play |

**Pros:**
- Creates scarcity (games have value)
- Rewards popular creators directly
- Classic arcade feel

**Cons:**
- FRICTION - may hurt discovery and engagement
- Users might resent paying to play
- Complicated economics (free plays, costs, creator cuts)
- Target audience (ages 6-14) may not have patience for this

---

### Option C: Boosting & Featuring

Gems let creators promote their games.

| Feature | Description | Cost |
|---------|-------------|------|
| **Boost** | Game appears higher in feeds for 24h | 100 💎 |
| **Feature Request** | Submit for "Featured" consideration | 500 💎 |
| **Category Spotlight** | Top of category for 6h | 200 💎 |

**Pros:**
- Clear value proposition
- Doesn't gate playing games
- Encourages game creation

**Cons:**
- Can feel pay-to-win for visibility
- Rich creators get richer
- Needs curation to prevent spam

---

### Option D: Tipping Other Creators

Social tipping system where players can send Gems to creators they appreciate.

| Tip Size | Gems | Social Visibility |
|----------|------|-------------------|
| "Nice!" | 5 💎 | Small animation |
| "Love it!" | 25 💎 | Medium animation + appears in feed |
| "Amazing!" | 100 💎 | Large celebration + badge on game |

**Pros:**
- Builds community
- Rewards quality directly
- Feel-good interactions

**Cons:**
- May need to prevent harassment via tipping
- Kids tipping strangers = parental concern?
- Doesn't directly benefit the tipper

---

### Option E: Unlock Premium Templates

Some game templates require Gems to access.

| Template Tier | Access | Examples |
|---------------|--------|----------|
| **Basic** | Free | Endless Runner, Breakout |
| **Standard** | 500 💎 once | Pinball, Slingshot |
| **Premium** | 2000 💎 once | 3D templates, multiplayer |

**Pros:**
- Clear value
- One-time unlock (not recurring cost)
- Progression system

**Cons:**
- Limits creativity for new users
- May feel like paywall
- What if user runs out of ideas with free templates?

---

### RECOMMENDATION: Hybrid Approach

Start with **Cosmetics (A)** as the primary Gem sink, with optional **Tipping (D)**:

1. **Cosmetics** - AI-generated profile customization (primary sink)
2. **Tipping** - Social appreciation system (secondary sink)
3. **Later**: Add boosting, premium templates as the economy matures

**Reasoning:**
- Cosmetics leverage your AI generation strength
- Tipping builds community without friction
- Avoids gating gameplay (which kills discovery)
- Can add more sinks later based on player behavior

---

## Part 2: How Do You EARN Gems?

### Earning Method A: Playing Games

| Trigger | Gems Earned | Notes |
|---------|-------------|-------|
| Complete a game | 1-5 💎 | Based on game length |
| First play of a new game | +2 💎 bonus | Encourages exploration |
| Play 5 unique games/day | 10 💎 bonus | Daily challenge |
| Play 10 unique games/day | 25 💎 bonus | Bigger challenge |

**Anti-farming measures:**
- Only unique game plays count (can't spam same game)
- Minimum play time (e.g., 30 seconds) to qualify
- Daily cap (e.g., 50 Gems from playing)

---

### Earning Method B: Creator Rewards

| Trigger | Gems Earned | Notes |
|---------|-------------|-------|
| Someone plays your game | 1 💎 | Per unique player |
| Game gets 10 plays | 10 💎 bonus | Milestone |
| Game gets 100 plays | 100 💎 bonus | Bigger milestone |
| Game featured by staff | 500 💎 | Curated reward |

**Anti-abuse measures:**
- Only count authenticated unique users
- Minimum game quality threshold (auto-flag empty/broken games)
- Rate limit payouts per game per day

---

### Earning Method C: Daily Login

| Day | Gems |
|-----|------|
| Day 1 | 5 💎 |
| Day 2 | 10 💎 |
| Day 3 | 15 💎 |
| Day 4 | 20 💎 |
| Day 5 | 25 💎 |
| Day 6 | 30 💎 |
| Day 7 | 50 💎 (BONUS!) |

**Total weekly**: 155 💎 for logging in every day

**Reset behavior:**
- Miss a day = reset to Day 1
- OR: Miss a day = lose streak but keep progress (more forgiving)

---

### Earning Method D: Achievements

One-time rewards for accomplishments:

| Achievement | Gems | Difficulty |
|-------------|------|------------|
| "First Game" - Publish your first game | 100 💎 | Easy |
| "Explorer" - Play 10 different games | 50 💎 | Easy |
| "Adventurer" - Play 50 different games | 200 💎 | Medium |
| "Creator" - Publish 5 games | 250 💎 | Medium |
| "Popular" - Get 100 total plays on your games | 500 💎 | Hard |
| "Viral" - Get 1000 total plays | 2000 💎 | Very Hard |
| "Collector" - Own 10 cosmetics | 100 💎 | Medium |
| "Fashionista" - Own 25 cosmetics | 500 💎 | Hard |

---

### Earning Method E: Level System (XP → Gems)

Users earn XP for actions, level up, and get Gems at each level:

| Action | XP |
|--------|-----|
| Play a game | 10 XP |
| Create a game | 50 XP |
| Your game played | 5 XP |
| Daily login | 25 XP |

| Level | XP Required | Gem Reward |
|-------|-------------|------------|
| 2 | 100 XP | 50 💎 |
| 3 | 250 XP | 75 💎 |
| 4 | 500 XP | 100 💎 |
| 5 | 1000 XP | 150 💎 |
| 10 | 5000 XP | 500 💎 |
| 20 | 25000 XP | 2000 💎 |

**Pros:**
- Clear progression system
- Feels rewarding
- Can unlock features at certain levels

**Cons:**
- Complexity
- Needs UI for levels/progress
- Another number to track

---

### RECOMMENDATION: Start Simple

**Phase 1 (Launch):**
- Daily login bonus (simple, proven)
- Achievement rewards (one-time, encourage exploration)
- Playing games earns Gems (primary ongoing source)

**Phase 2 (Post-Launch):**
- Creator rewards (once you have enough games)
- Level system (once you want deeper progression)

---

## Part 3: Economy Balance

### Target Values

| Metric | Target | Reasoning |
|--------|--------|-----------|
| **Daily Gem Earning (Casual)** | 50-100 💎 | 15 min play session |
| **Daily Gem Earning (Active)** | 150-250 💎 | 1 hour play session |
| **Cosmetic Prices** | 50-2000 💎 | 1 day - 2 weeks of play |
| **Cheapest Cosmetic** | 50 💎 | Achievable in 1 session |
| **Premium Cosmetic** | 2000 💎 | 2+ weeks of dedicated play |

### Weekly Earning Projection

| Source | Casual (15 min/day) | Active (1 hr/day) |
|--------|---------------------|-------------------|
| Daily Login | 155 💎 | 155 💎 |
| Playing Games | 175 💎 (5/day × 7) | 700 💎 (20/day × 7) |
| Achievements | ~100 💎 | ~300 💎 |
| **Total** | **~430 💎/week** | **~1155 💎/week** |

### Purchasing Gems (IAP)

If users want to accelerate:

| Pack | Price | Gems | Bonus | $/Gem |
|------|-------|------|-------|-------|
| Starter | $0.99 | 500 💎 | 0% | $0.002 |
| Value | $4.99 | 3000 💎 | 20% | $0.0017 |
| Premium | $9.99 | 7500 💎 | 50% | $0.0013 |

**Key insight**: $1 buys roughly 500-750 Gems, meaning:
- Cheapest cosmetic (50 💎) ≈ $0.10
- Premium cosmetic (2000 💎) ≈ $3-4

This feels reasonable for optional cosmetics.

---

## Part 4: Sparks ↔ Gems Exchange

### Option: No Exchange (RECOMMENDED for launch)

Keep currencies completely separate:
- Sparks = AI generation only
- Gems = Cosmetics/social only

**Pros:**
- Simple to understand
- No arbitrage concerns
- Clear mental model

**Cons:**
- Users with excess Sparks can't get cosmetics
- Users with excess Gems can't generate AI content

---

### Option: One-Way (Sparks → Gems)

Allow converting Sparks to Gems (but not reverse):

| Conversion | Rate |
|------------|------|
| 100 Sparks → 50 Gems | 2:1 ratio |

**Pros:**
- Whales can accelerate cosmetic collection
- Simple one-way flow

**Cons:**
- Devalues earned Gems
- Changes Gem economy significantly

---

### Option: One-Way (Gems → Sparks) - ADVANCED

Allow converting Gems to Sparks (effectively "cashing out" gameplay):

| Conversion | Rate |
|------------|------|
| 1000 Gems → 100 Sparks | 10:1 ratio |

**Pros:**
- Creators can earn AI credits from popularity
- Strong incentive to make good games
- Circular economy

**Cons:**
- VERY complex to balance
- Potential for farming/abuse
- Might have tax implications (earning "value")

**RECOMMENDATION**: Start with no exchange. Add one-way Sparks→Gems later if there's demand.

---

## Part 5: Schema Additions Needed

Already added to credit-system-implementation.md:
- `user_gems` - Balance tracking
- `gem_transactions` - Audit log
- `gem_products` - IAP products for buying Gems

Still needed (if implementing all features):

```sql
-- Achievements system
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  gem_reward INTEGER NOT NULL,
  criteria_type TEXT NOT NULL,  -- 'games_played', 'games_created', etc.
  criteria_value INTEGER NOT NULL,  -- threshold to unlock
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id TEXT NOT NULL REFERENCES users(id),
  achievement_id TEXT NOT NULL REFERENCES achievements(id),
  unlocked_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, achievement_id)
);

-- Daily login tracking
CREATE TABLE IF NOT EXISTS daily_logins (
  user_id TEXT NOT NULL REFERENCES users(id),
  login_date TEXT NOT NULL,  -- YYYY-MM-DD format
  streak_day INTEGER NOT NULL,  -- 1-7
  gems_claimed INTEGER NOT NULL,
  PRIMARY KEY (user_id, login_date)
);

-- User cosmetics (owned items)
CREATE TABLE IF NOT EXISTS user_cosmetics (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  cosmetic_type TEXT NOT NULL,  -- 'avatar_frame', 'background', etc.
  name TEXT,
  prompt TEXT,  -- The AI prompt used to generate
  asset_url TEXT NOT NULL,
  gem_cost INTEGER NOT NULL,
  is_equipped INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_cosmetics_user ON user_cosmetics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cosmetics_equipped ON user_cosmetics(user_id, is_equipped);

-- Level/XP system (if implementing)
-- Could be a column on users table instead:
-- ALTER TABLE users ADD COLUMN xp INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE users ADD COLUMN level INTEGER NOT NULL DEFAULT 1;
```

---

## Part 6: Open Questions for Review

### Business Questions
1. **Target audience affordability**: Ages 6-14 typically have limited funds. Should Gems be primarily earned, with IAP as acceleration?
2. **Parental controls**: Should Gem purchases require parental approval? (Probably yes for minors)
3. **Creator payouts**: If creators earn Gems from plays, should they be able to convert to real money eventually?

### Design Questions
4. **Cosmetic moderation**: AI-generated cosmetics could include inappropriate content. How to moderate?
5. **Cosmetic visibility**: When do other users see your cosmetics? (Profile page? In-game avatars? Leaderboards?)
6. **Social features timeline**: Multiplayer/social requires cosmetics to matter. What's the timeline?

### Technical Questions
7. **Cosmetic generation costs**: Should cosmetic generation cost Sparks + Gems, or just Gems (and we absorb AI cost)?
8. **Gem inflation**: How do we prevent Gem inflation over time as achievements run out?
9. **Storage**: Where do generated cosmetics live? (R2? Same as game assets?)

---

## Part 7: Phased Implementation Recommendation

### Phase 0: Schema Only (NOW)
- [x] Add `user_gems`, `gem_transactions`, `gem_products` tables
- [ ] Add basic GemService (credit/debit, similar to WalletService)
- [ ] No UI yet, just backend foundation

### Phase 1: Basic Earning (Post-Sparks Launch)
- [ ] Daily login bonus
- [ ] Playing games earns Gems
- [ ] Basic achievement system (5-10 achievements)
- [ ] Gem balance display in UI

### Phase 2: Spending - Cosmetics (2-4 weeks later)
- [ ] Cosmetic types defined
- [ ] AI generation flow for cosmetics
- [ ] Profile customization UI
- [ ] Cosmetic gallery/inventory

### Phase 3: Social Features (When multiplayer launches)
- [ ] Tipping system
- [ ] Cosmetics visible to other players
- [ ] Creator rewards for plays
- [ ] Leaderboards with cosmetic flair

### Phase 4: Advanced Economy
- [ ] Premium templates unlock
- [ ] Game boosting
- [ ] Sparks → Gems conversion
- [ ] Level/XP system

---

## Summary

| Decision | Recommendation | Confidence |
|----------|----------------|------------|
| Primary Gem sink | AI-generated cosmetics | HIGH |
| Secondary Gem sink | Tipping creators | MEDIUM |
| Primary Gem source | Playing games | HIGH |
| Secondary Gem source | Daily login + achievements | HIGH |
| Exchange rate | No exchange (separate currencies) | HIGH |
| IAP for Gems | Yes, as acceleration | HIGH |
| Arcade model (pay to play) | NO - kills discovery | HIGH |

---

## Next Steps

1. **Review this document** with Oracle or other strategic agents
2. **Decide on Phase 1 scope** - What's the minimum Gems system for launch?
3. **Design cosmetic types** - What AI-generated cosmetics are technically feasible?
4. **Plan moderation** - How to handle inappropriate AI-generated content?
5. **Update credit system plan** with additional tables if needed

---

*This document is a brainstorm for discussion. No implementation should begin until design is finalized.*
