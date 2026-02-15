# Slopcade Economic Vision

> **Status**: Finalized v1.0 — February 2026
> **Purpose**: Permanent product strategy document. The "why" behind every economic decision.

---

## The Core Thesis

Slopcade is an AI-powered game creation platform where anyone can describe a game and play it within minutes. The business model is a **flywheel** — every participant's actions feed value to everyone else, creating a self-reinforcing growth loop.

The platform has four participant classes: **Players**, **Creators**, the **Asset Store**, and the **Platform itself** (including first-party template games). Each needs clear incentives that naturally compound.

---

## The Flywheel

```
                    ┌─────────────────────────────────┐
                    │   FIRST-PARTY TEMPLATE GAMES     │
                    │   (bootstrap the catalog)        │
                    └──────────────┬──────────────────┘
                                   │ attract initial
                                   │ players
                                   ▼
                  ┌──────────────────────────────────────┐
                  │             PLAYERS                   │
                  │   play · party · share · spend        │
                  └───┬──────────────┬──────────────┬────┘
                      │              │              │
              play &  │  try the AI  │    host a    │
              spend   │   builder    │    party     │
                      │              │              │
                      ▼              ▼              ▼
            ┌──────────┐    ┌───────────┐    ┌──────────────┐
            │ Revenue  │    │ CREATORS  │    │ VIRAL LOOP   │
            │ Pool     │    │ build ·   │    │ 4-8 friends   │
            │          │    │ sell ·    │    │ per session    │
            └────┬─────┘    │ remix    │    └──────┬───────┘
                 │          └──┬──┬─────┘           │
                 │             │  │                  │
            pays │      build  │  │ sell             │ each friend
          creators    games    │  │ assets           │ becomes a
                 │             │  │                  │ potential
                 ▼             ▼  ▼                  │ player &
            ┌──────────┐    ┌──────────┐             │ creator
            │ Creator  │    │ ASSET    │             │
            │ Earnings │    │ STORE    │             │
            └──────────┘    └────┬─────┘             │
                                 │                   │
                          faster │                   │
                        creation │                   │
                                 ▼                   │
                  ┌──────────────────────┐           │
                  │   MORE & BETTER      │◄──────────┘
                  │   CONTENT            │
                  └──────────┬───────────┘
                             │ attracts
                             ▼
                      (back to PLAYERS)
```

**The core loop**: Content attracts players → players become creators (AI lowers the barrier) → creators make content → content attracts more players.

**Party mode is the viral accelerant**: Each session exposes 4-8 non-users to the platform. This is the primary organic growth engine.

**The monetization loop runs parallel**: Players spend Sparks → revenue pool pays creators → creators invest in better content → better content drives more spending.

---

## Participant Incentive Structure

### Players

| | |
|---|---|
| **Give** | Attention, money (Sparks/subscription), social distribution (party invites) |
| **Get** | Games, party experiences, creation tools, social status |
| **Why they stay** | Fresh AI-generated content, party hosting, creative expression |
| **Key metric** | Retention = games played + parties hosted + games created |

The most important conversion in the system: **Player → Creator**. Traditional game platforms have <1% player-to-creator conversion because creation requires coding. With AI generation, we target 5-10% because the barrier is "describe what you want." The signup grant exists specifically to fund this first creation.

### Creators

| | |
|---|---|
| **Give** | Games, assets, templates, curation |
| **Get** | Revenue (engagement pool + asset sales), audience, AI tools, distribution |
| **Why they stay** | Low creation cost via AI, growing audience, earnings at scale |
| **Key metric** | Monthly earnings, play counts on their games |

**Critical insight**: At early scale (<25K MAU), creators are motivated by creative tools and audience, not money. Revenue becomes the primary driver at 100K+ MAU. Don't over-promise economics pre-scale — lead with the tools.

### Asset Store

| | |
|---|---|
| **Give** | Discovery, trust, transaction infrastructure |
| **Get** | Take rate on sales (15-20%) |
| **Why it works** | Network effects — more buyers attract more sellers and vice versa |
| **Key mechanic** | Every asset sale reduces creation friction → more games → more players → more asset demand |

This is the Unity Asset Store model applied to AI-native game creation.

### Platform (Slopcade)

| | |
|---|---|
| **Give** | AI tools, infrastructure, curation, first-party templates |
| **Get** | Subscription + credit + marketplace revenue |
| **Why it compounds** | Each new participant strengthens the loop for all others |

---

## First-Party Games: The Netflix Model

The founder builds template games (Flappy Bird, Breakout, Snake, Ball Sort, etc.). These bootstrap the catalog but must not compete with creators — that would be the "Amazon Basics" problem.

### Resolution: Templates, Not Products

| Principle | Implementation |
|-----------|----------------|
| Templates are **forkable starting points** | Labeled "Template" in UI, one-click "Remix this game" |
| Templates **don't earn** from the engagement pool | Signals the pool is for creators, not self-dealing |
| Templates **fill genre gaps** creators haven't covered | As creators fill a genre, founder stops competing |
| Templates **demonstrate AI tool capability** | "Built with the same tools you have" |
| Templates are the **Player → Creator on-ramp** | Play → Remix → Create progression |

### Transition Timeline

| Phase | First-Party Content | Creator Content |
|-------|--------------------|-----------------| 
| Launch (<1K creators) | ~80% of catalog | ~20% |
| Growth (1K-10K creators) | ~20% | ~80% |
| Scale (>10K creators) | <5% (toolkit focus) | 95%+ |

The founder's real product is the AI creation tool, not the games.

---

## Tier Structure

### Two Tiers (Free + Pro)

| Feature | Free | Pro ($9.99/mo) |
|---------|------|----------------|
| **Play games** | Unlimited | Unlimited |
| **Join party games** | Unlimited | Unlimited |
| **Host party games** | 3/month | Unlimited |
| **Create games (AI builder)** | With Sparks | With Sparks |
| **Signup Sparks** | 500 ($5.00) | 500 ($5.00) |
| **Monthly Sparks stipend** | — | 1,000/mo ($10.00), refills to 1,500 max |
| **AI generation cost** | Standard (2x margin) | Discounted (1.5x margin) |
| **Generation queue** | Standard | Priority |
| **Asset privacy** | Public | Private option |
| **Offline play** | Local only | Cloud sync (any device) |
| **Hosted game player cap** | 4 players | 12 players |
| **Asset store revenue split** | 80/20 | 85/15 |

### Why Two Tiers, Not Three

Creator-tools with three tiers almost always have a dead middle tier. Slopcade effectively has 2.5 tiers already: Free + Pro + à la carte Spark purchases. A "Teams/Studio" tier emerges organically when there's demand for multi-editor workspaces and org billing — that's a post-PMF concern.

### Why Free Hosting (3/month)

Party mode is the **primary viral growth engine**. Gating it entirely behind Pro creates a bottleneck where your most shareable feature depends on paying users initiating sessions.

The actual cost of hosting a game session is near-zero — Cloudflare Durable Objects handle WebSocket state for fractions of a penny. What costs money is **live API calls** during a session: AI-generated voice announcements, real-time image generation, etc. Games that use pre-generated assets (the vast majority) cost essentially nothing to host.

The expensive operations (live voice, live generation) can be gated independently of hosting access.

---

## Credit System: Sparks

### Currency Fundamentals

```
1 Spark = $0.01 = 10,000 microdollars
100 Sparks = $1.00
1,000 Sparks = $10.00
```

Sparks are the universal unit for AI creation AND marketplace purchases. One currency for the entire economy keeps the mental model simple.

### Signup Grant

**500 Sparks ($5.00)** for new users. This funds approximately:
- ~12 entity sprite generations, or
- ~1-2 complete game creations (with sprites + background + LLM)

This is calibrated to let a new user create their first game for free — the critical conversion moment from Player to Creator.

**Future consideration**: This could be increased as an "early adopter bonus" for launch period, then reduced as the platform matures and the value of the creation tools speaks for itself.

### Monthly Pro Stipend: Refill-to-Threshold

Instead of a hard accumulation cap, Sparks refill UP TO a ceiling each month:

```
Rule: On billing date, if balance < 1,500 Sparks, add Sparks up to min(balance + 1,000, 1,500).

Month 1: Balance 0    → +1,000 → Balance 1,000   (full refill)
Month 2: Spent 800    → Balance 200 → +1,000 → Balance 1,200   (full refill)
Month 3: Spent nothing → Balance 1,200 → +300 → Balance 1,500  (partial, capped)
Month 4: Spent 200    → Balance 1,300 → +200 → Balance 1,500   (partial, capped)
```

**Why this works**:
- Active users who spend get fully replenished every month
- Inactive users don't accumulate infinitely
- No "cliff" where the user feels cheated losing credits they paid for
- Simple explanation: "Your Sparks refill up to 1,500 each month"

**On cancellation**: Stipend-granted Sparks expire 90 days after cancellation. Purchased Sparks never expire.

### À La Carte Spark Packs

| Pack | Price | Sparks | $/Spark | Bonus |
|------|-------|--------|---------|-------|
| Starter | $0.99 | 50 | $0.0198 | — |
| Creator | $4.99 | 275 | $0.0181 | 10% |
| Studio | $19.99 | 1,200 | $0.0166 | 20% |

Higher packs give volume discounts, incentivizing larger purchases.

### Pro Generation Discount

Pro users pay **1.5x provider margin** (vs 2x standard). Their $10 monthly stipend effectively buys $13.33 worth of generation at standard rates. Combined with priority queue access, this makes Pro feel like a genuine creator tool, not just a hosting pass.

---

## Asset Store Economics

### Revenue Split

| Seller Type | Creator Gets | Platform Gets |
|-------------|-------------|---------------|
| Free-tier creator | 80% | 20% |
| Pro subscriber creator | 85% | 15% |
| First-party assets | Free to use | N/A |

80/20 is more generous than Steam (70/30) and competitive with Epic (88/12). The Pro improvement to 85/15 is an additional subscription incentive.

First-party assets are free — they bootstrap the store and don't compete with creators.

### What's Sellable

| Asset Type | Examples | Price Range |
|------------|----------|-------------|
| Sprite packs | Characters, backgrounds, UI | 50-200 Sparks ($0.50-2.00) |
| Sound packs | SFX bundles, music loops | 50-200 Sparks |
| Game templates | Complete forkable games | 200-500 Sparks ($2.00-5.00) |
| Theme packs | Cohesive visual sets | 100-300 Sparks |
| Script modules | Reusable game logic | 50-300 Sparks |

**Everything is priced in Sparks** — this creates demand for the platform currency and keeps the economy unified. The monthly Pro stipend becomes spending money for both creation AND purchasing.

### How the Asset Store Feeds the Flywheel

```
Creator A builds a great space game
  → Packages the space art as an asset pack ($2.00)
    → Creator B buys it, builds a different space game faster
      → Creator B's game attracts players who also want space assets
        → Creator A earns passive revenue
          → Creator A invests in more asset packs
```

Every asset sale reduces creation friction → more games → more players → more asset demand.

**Natural price floor**: No asset should cost more than generating it yourself with AI. This keeps the marketplace honest and creates healthy competition between "make vs buy."

---

## Creator Engagement Revenue Pool

### How It Works

**30% of net subscription revenue** is distributed to creators based on engagement time.

```
creator_payout = (creator_engagement_minutes / total_engagement_minutes) × pool_size
```

Engagement **minutes** (not play counts or sessions) prevents click-farming and rewards games people actually enjoy spending time in.

### Pool Size at Scale

| Scale | Pro Subs | Monthly Pool | Top 10 Creators | Top 100 Creators |
|-------|----------|-------------|-----------------|------------------|
| 10K MAU | 1,000 | $2,100 | ~$100/mo each | ~$10/mo each |
| 50K MAU | 5,000 | $10,500 | ~$500/mo each | ~$50/mo each |
| 100K MAU | 10,000 | $21,000 | ~$1,000/mo each | ~$100/mo each |
| 500K MAU | 50,000 | $105,000 | ~$5,000/mo each | ~$500/mo each |

**Industry comparison**: Roblox pays ~29% of revenue to creators. YouTube pays ~55%. 30% is competitive while keeping platform economics healthy.

### First-Party Games Don't Participate

Template games built by the founder do NOT earn from the engagement pool. This is an explicit signal that the pool exists for creators, and prevents the "Amazon Basics competing with sellers" perception.

---

## Hosting & Live Content Cost Model

### What's Free

**Game hosting (server infrastructure) is effectively free.** Cloudflare Durable Objects handle WebSocket state synchronization for fractions of a penny per session. Any game that uses pre-generated assets — which is the vast majority — costs essentially nothing to host and play.

This is a structural advantage. Unlike Roblox (which runs dedicated game servers) or traditional game hosting (AWS/GCP instances), Slopcade games are client-side Godot WASM with lightweight server-side state sync. The heavy compute (physics, rendering) runs on the player's device.

### What Costs Money

The expensive operations are **live API calls during a session**:

| Operation | When It Happens | Cost | Who Pays |
|-----------|----------------|------|----------|
| **Live AI voice** (announcer, narrator) | Party game voice commentary | $0.06-0.30/min | Deducted from host's Sparks |
| **Live image generation** | Real-time asset creation during play | $0.02/image | Deducted from requestor's Sparks |
| **Live sound generation** | New SFX not already cached | $0.01/generation | Deducted from requestor's Sparks |

**Pre-generated content is cached.** Sound effects, sprites, backgrounds — once generated, they're stored in R2 (content-addressed) and served for free forever. The cost is one-time at creation, not per-play.

### Implication for Hosting Rules

| Game Type | Hosting Cost | Access |
|-----------|-------------|--------|
| Games with pre-generated assets only | ~$0 (WebSocket relay) | Free for everyone |
| Games with live AI voice/generation | $0.50-3.00/session | Costs Sparks per live API call |

This means the hosting gate isn't "Pro vs Free" — it's "does this game use expensive live APIs." A creator can build a party game that's free to host because all the assets are pre-generated. A game with a live AI announcer voice costs Sparks when those voice calls fire.

---

## Where Money Comes From (Revenue Streams)

| Stream | Driver | Margin |
|--------|--------|--------|
| **Pro Subscriptions** | 10% of MAU × $9.99/mo | ~75% after stipend cost + creator pool |
| **Spark Purchases** | Power creators + impulse buyers | ~95% (2x margin on 50% of credits consumed) |
| **Asset Store Take** | 15-20% of marketplace GMV | ~100% (pure margin) |
| **Gems** (social/premium) | Cosmetics, tipping, social features | ~99% (virtual goods) |

### Revenue Projection

| Scale | MAU | Pro Subs | Subs Revenue | Sparks Revenue | Asset Store | Total |
|-------|-----|----------|-------------|----------------|-------------|-------|
| Launch | 1K | 100 | $1,000 | $800 | $100 | $1,900/mo |
| Year 1 | 25K | 2,500 | $25,000 | $12,000 | $3,000 | $40,000/mo |
| Year 2 | 100K | 10,000 | $100,000 | $40,000 | $15,000 | $155,000/mo |
| Year 3 | 500K | 50,000 | $500,000 | $150,000 | $75,000 | $725,000/mo |

---

## Where Money Goes (Cost Structure)

### Per-Unit Provider Costs

| Operation | Provider | Our Cost | User Price (Std) | User Price (Pro) |
|-----------|----------|----------|-----------------|-----------------|
| Sprite generation | Scenario.com | $0.02 | 4 Sparks ($0.04) | 3 Sparks ($0.03) |
| Background generation | Scenario.com | $0.02 | 4 Sparks ($0.04) | 3 Sparks ($0.03) |
| Parallax layer | Scenario.com | $0.05 | 10 Sparks ($0.10) | 8 Sparks ($0.08) |
| LLM step (Free tier) | OpenRouter / GPT-4o-mini | $0.005 | 0.5 Sparks ($0.005) | — |
| LLM step (Standard) | OpenRouter / GPT-4o | $0.02 | 2 Sparks ($0.02) | 1.5 Sparks ($0.015) |
| LLM step (Pro) | OpenRouter / Claude Sonnet | $0.05 | 5 Sparks ($0.05) | 3.75 Sparks ($0.0375) |
| Live voice | OpenAI Realtime | $0.06-0.30/min | Per-minute Spark charge | Per-minute (discounted) |
| SFX generation | ElevenLabs | $0.01 | 4 Sparks ($0.04) | 3 Sparks ($0.03) |

### Infrastructure Costs (Cloudflare)

| Service | Cost | Notes |
|---------|------|-------|
| Workers (compute) | $5/mo + $0.30/M requests | API hosting |
| Durable Objects | $12.50/M GB-seconds | Party rooms, voice relay |
| D1 Database | $0.001/M reads, $1/M writes | User data, economy |
| R2 Storage | $0.015/GB-month, **$0 egress** | All assets |
| **Total at 50K MAU** | **~$500/mo** | Near-zero marginal cost |

**Key advantage**: $0 egress on Cloudflare. For a game platform serving thousands of asset files and WebSocket connections, this saves thousands/month vs AWS.

### Payment Processing

| Channel | Fee on $9.99 | Platform Keeps | Strategy |
|---------|-------------|----------------|----------|
| Stripe (web) | ~$0.59 (6%) | $9.40 | **Preferred** — drive web subs |
| Apple (15%, Small Business) | $1.50 | $8.49 | Acceptable |
| Apple (30%, standard) | $3.00 | $6.99 | Avoid if possible |

**Apple Pay via Stripe on web** = best of both worlds. Apple Pay UX with Stripe's 3% fees instead of Apple's 30%.

---

## Cold Start Sequence

### Phase 1: Content + Players (Months 1-3)
- 8-12 polished template games across genres
- Party mode as primary growth engine
- $5 signup grant converts players to creators
- "Remix this game" prominent everywhere
- **Target**: 1K MAU, 50 games created/week

### Phase 2: Creator Onboarding (Months 3-6)
- Featured creator program (10-20 hand-picked, given Spark grants)
- Asset store beta (founder assets free + featured creator assets)
- **Target**: 5K MAU, 200 creators, 50 asset listings

### Phase 3: Economic Flywheel (Months 6-12)
- Engagement revenue pool goes live
- Pro subscription launches
- Asset store opens to all creators
- **Target**: 25K MAU, 1K creators, $10K/mo asset store GMV

### Phase 4: Scale (Year 2+)
- Creator success stories drive organic acquisition
- Founder reduces template output, community fills gaps
- Enterprise/education vertical
- **Target**: 100K+ MAU, self-sustaining flywheel

---

## Risks & Flywheel Killers

### Critical

| Risk | Why It Matters | Mitigation |
|------|---------------|------------|
| Party mode doesn't convert | Viral loop dies, no organic growth | Post-party follow-up, persistent history, async modes |
| AI quality plateaus | Creators disengage, players leave | Template variety, manual editing, quality scoring |
| Player → Creator < 2% | Flywheel never spins up | Optimize "Remix" UX, guided flows, calibrate Spark costs |

### Moderate

| Risk | Why It Matters | Mitigation |
|------|---------------|------------|
| App Store tax (15-30%) | Compresses margins | Drive web subs via Stripe/Apple Pay |
| AI provider price increases | Margin compression | 2x margin buffers; diversify providers; self-host at scale |
| Marketplace pollution | Discovery fails | Quality scoring, curation, reputation |
| Voice costs scale poorly | Party mode becomes unprofitable | Pre-cache, cheaper TTS, rate limit free sessions |

### Manageable

| Risk | Why It Matters | Mitigation |
|------|---------------|------------|
| Creator economics thin early | Vocal critics | Lead with tools + audience, be transparent about scale |
| Dual currency confusion | User friction | Clear labeling: Sparks = creation, Gems = social |

---

## Industry Comparisons

| Platform | Model | Creator Share | Our Advantage |
|----------|-------|---------------|---------------|
| **Roblox** | Robux + Premium ($9.99) | ~29% of revenue | AI-powered creation (no coding), lower barrier |
| **Rec Room** | Tokens + RR+ ($7.99) | Variable | Better creation tools, physics engine |
| **Fortnite Creative** | V-Bucks + Crew ($11.99) | Engagement payouts | Open creation (not limited to Fortnite mechanics) |
| **Steam** | Game sales | 70% to developer | AI creation + hosting included |
| **Unity Asset Store** | Asset sales | 70% to seller | Integrated creation + marketplace + hosting |

Slopcade's unique position: the **only platform where AI generates the game AND the marketplace AND the hosting are unified**. No other platform offers "describe a game → play it in minutes → sell the assets → earn from engagement" in one loop.

---

## Summary of Key Economic Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Signup grant | 500 Sparks ($5.00) | ~1-2 full game creations for free |
| Pro subscription | $9.99/mo | Matches Roblox Premium |
| Pro stipend | 1,000 Sparks/mo ($10.00) | 100% value-back (industry standard) |
| Stipend ceiling | 1,500 Sparks ($15.00) | Refill-to-threshold model |
| Standard margin | 2x provider cost | Healthy but not exploitative |
| Pro margin | 1.5x provider cost | Incentivizes Pro, increases utilization |
| Creator engagement pool | 30% of net sub revenue | Matches Roblox (~29%) |
| Asset store split (Free) | 80/20 creator/platform | More generous than Steam (70/30) |
| Asset store split (Pro) | 85/15 creator/platform | Incentivizes Pro subscription |
| Free party hosting | 3 sessions/month | Viral growth engine, low marginal cost |
| Stipend post-cancellation | 90-day expiry | Fair to users, prevents abuse |
| Purchased Sparks expiry | Never | Trust signal |
