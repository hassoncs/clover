# Slopcade Economics: Platform, Flywheel & Monetization

> **Version**: 1.0 — February 2026
> **Author**: Platform Economics Planning
> **Status**: Draft for Review

---

## Executive Summary

Slopcade is an AI-powered game creation platform where anyone can describe a game and play it within minutes. Revenue comes from three converging streams: **subscriptions** (Pro membership), **consumable credits** (Sparks for AI generation), and a **creator marketplace** (asset store).

The business model is a **flywheel** — each participant's actions feed value to everyone else:

```
More Content → More Players → More Revenue → Better AI Tools → More Creators → More Content
                    ↑                                                    |
                    └──── Party Mode (4-8 friends per session) ──────────┘
```

### Why This Works

| Metric | Value | Comparable |
|--------|-------|------------|
| **AI generation margin** | 2x provider cost (50% gross margin on credits) | SaaS standard |
| **Pro subscription** | $9.99/mo, ~75% gross margin after credit stipend | Roblox Premium: $9.99/mo |
| **Infrastructure** | Near-zero marginal cost (Cloudflare, no egress) | Better than AWS-based competitors |
| **Viral coefficient** | 4-8x per party session (each host invites friends) | Jackbox-style organic growth |
| **Player → Creator conversion** | Enabled by AI (describe → play in minutes) | Unique — no competitor matches this |

### Revenue Projection (Conservative)

| Scale | MAU | Pro Subs (10%) | Monthly Revenue | Monthly Costs | Gross Margin |
|-------|-----|----------------|-----------------|---------------|--------------|
| Launch | 1K | 100 | $2,500 | $1,200 | 52% |
| Year 1 | 25K | 2,500 | $45,000 | $20,000 | 56% |
| Year 2 | 100K | 10,000 | $160,000 | $55,000 | 66% |
| Year 3 | 500K | 50,000 | $800,000 | $200,000 | 75% |

Margins improve at scale because AI provider costs are ~5% of credit value consumed (not all credits are spent), infrastructure costs don't grow linearly (Cloudflare), and asset store revenue is pure margin.

---

## Part 1: The Flywheel

### How Value Flows Between Participants

```
                    ┌─────────────────────────────────┐
                    │   FIRST-PARTY TEMPLATE GAMES     │
                    │   (bootstrap the catalog)        │
                    └──────────────┬──────────────────┘
                                   │ attract
                                   ▼
                  ┌──────────────────────────────────────┐
                  │             PLAYERS                   │
                  │   (play, party, share, spend)         │
                  └───┬──────────────┬──────────────┬────┘
                      │              │              │
              play &  │  try the AI  │    host a    │
              spend   │   builder    │    party     │
                      │              │              │
                      ▼              ▼              ▼
            ┌──────────┐    ┌───────────┐    ┌──────────────┐
            │ Revenue  │    │ CREATORS  │    │ VIRAL LOOP   │
            │ Pool     │    │ (build,   │    │ (4-8 friends  │
            │          │    │  sell,    │    │  per session)  │
            └────┬─────┘    │  remix)   │    └──────┬───────┘
                 │          └──┬──┬─────┘           │
                 │             │  │                  │
            pays │      build  │  │ sell             │ convert
          creators    games    │  │ assets           │ to players
                 │             │  │                  │
                 ▼             ▼  ▼                  │
            ┌──────────┐    ┌──────────┐             │
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

### Each Participant's Role

| Participant | What They Give | What They Get | Why They Stay |
|-------------|---------------|---------------|---------------|
| **Players** | Attention, money, social distribution (inviting friends) | Games, party experiences, creation tools | Fresh content, party hosting, creative expression |
| **Creators** | Games, assets, templates | Revenue share, audience, AI tools | Low creation cost via AI, growing audience, earnings |
| **Asset Store** | Discovery, trust, transaction infrastructure | Take rate on sales (15-20%) | Network effects (more buyers ↔ more sellers) |
| **Platform (Slopcade)** | AI tools, infrastructure, curation, first-party templates | Subscription + credit + marketplace revenue | Owns the flywheel |

### The Critical Conversion: Player → Creator

This is the engine that powers everything else. Every other flywheel component depends on players becoming creators.

**Conversion path**: Play a party game → sign up (get $10 free Sparks) → "Remix this game" prompt → describe changes → AI rebuilds it → first creation complete.

AI is what makes this possible. Traditional game platforms have a <1% player-to-creator conversion rate because creation requires coding. With AI-powered generation, we target **5-10%** conversion because the barrier is "describe what you want."

---

## Part 2: Tier Structure & Subscription Model

### The Two Tiers

| Feature | Free | Pro ($9.99/mo) |
|---------|------|----------------|
| **Play games** | ✅ Unlimited | ✅ Unlimited |
| **Join party games** | ✅ Unlimited | ✅ Unlimited |
| **Host party games** | ✅ 3/month | ✅ Unlimited |
| **Create games (AI builder)** | ✅ With Sparks | ✅ With Sparks |
| **Signup Sparks** | 1,000 ($10.00) | 1,000 ($10.00) |
| **Monthly Sparks stipend** | — | **1,000/mo ($10.00), refills to 1,500 max** |
| **AI generation cost** | Standard (2x margin) | **Discounted (1.5x margin)** |
| **Generation queue** | Standard | **Priority** |
| **Asset privacy** | Public (all generations visible) | **Private option** |
| **Offline play** | ✅ Local only | ✅ **Cloud sync** (pick up on any device) |
| **Hosted game player cap** | 4 players | **12 players** |
| **Asset store revenue split** | 80/20 (creator/platform) | **85/15** (creator/platform) |

### Why Two Tiers, Not Three

- Creator-tools with three tiers almost always have a dead middle tier.
- Slopcade effectively has **2.5 tiers**: Free + Pro + à la carte Spark purchases. That's enough pricing flexibility.
- A third "Teams/Studio" tier emerges naturally when organic demand appears (multi-editor, shared libraries, org billing) — post-PMF.

### Subscription Economics

**$9.99/mo Pro subscription**:

| Component | Amount | Notes |
|-----------|--------|-------|
| Gross subscription revenue | $9.99 | |
| Stripe processing (web, 2.9% + $0.30) | –$0.59 | Web-only; mobile IAP is 15-30% |
| Spark stipend provider cost | –$0.50 | 1,000 Sparks × $0.01 face value × ~5% actual AI cost |
| Creator pool allocation (30%) | –$2.82 | Engagement-based payouts to game creators |
| **Net platform revenue** | **$6.08** | **61% net margin per subscriber** |

**Industry comparison for credit stipend value**:

| Platform | Subscription | Credit Value Returned | Ratio |
|----------|-------------|----------------------|-------|
| **Roblox Premium** | $9.99/mo | 1,000 Robux ($12.50) | 125% |
| **Rec Room Plus** | $7.99/mo | 6,500 Tokens ($10.00) | 125% |
| **Fortnite Crew** | $11.99/mo | 1,000 V-Bucks ($10.00) | 83% |
| **Slopcade Pro** | **$9.99/mo** | **1,000 Sparks ($10.00)** | **100%** |

At 100% value-back, the subscription feels fair — users get their money's worth in credits alone, making the Pro perks (priority queue, private assets, hosting, cloud sync, better revenue split) feel "free."

### Credit Stipend: Refill-to-Threshold Model

Instead of a hard accumulation cap, monthly Sparks refill UP TO a ceiling:

```
Rule: On billing date, if wallet < 1,500 Sparks, refill to min(balance + 1,000, 1,500).

Month 1: Balance 0 → +1,000 → Balance 1,000 ✅
Month 2: Spent 800 → Balance 200 → +1,000 → Balance 1,200 ✅
Month 3: Spent 0 → Balance 1,200 → +300 (capped at 1,500) ✅
Month 4: Spent 200 → Balance 1,300 → +200 (capped at 1,500) ✅
```

**Why this beats a hard cap**:
- Active users who spend get fully replenished every month ✓
- Inactive users don't accumulate infinitely ✓
- No "cliff" where the user feels cheated losing credits ✓
- Simpler to explain: "Your Sparks refill up to 1,500 each month" ✓

**On cancellation**: Stipend-granted Sparks expire 90 days after cancellation. Purchased Sparks never expire. This prevents chargebacks while being fair.

---

## Part 3: Cost Structure — Where Money Goes

### AI Image Generation (Scenario.com)

Our primary cost center for game creation. Every sprite, background, and visual asset is AI-generated.

| Asset Type | Provider Cost | User Price (Standard) | User Price (Pro) | Standard Margin | Pro Margin |
|------------|---------------|----------------------|-----------------|-----------------|------------|
| Entity sprite | $0.02 | 4 Sparks ($0.04) | 3 Sparks ($0.03) | 2.0x | 1.5x |
| Background | $0.02 | 4 Sparks ($0.04) | 3 Sparks ($0.03) | 2.0x | 1.5x |
| Title/Hero image | $0.02 | 4 Sparks ($0.04) | 3 Sparks ($0.03) | 2.0x | 1.5x |
| Hero (no BG removal) | $0.025 | 5 Sparks ($0.05) | 4 Sparks ($0.04) | 2.0x | 1.6x |
| Parallax layer | $0.05 | 10 Sparks ($0.10) | 8 Sparks ($0.08) | 2.0x | 1.6x |

**Typical game creation cost** (5 entities + 1 background + LLM generation):
- Provider cost: ~$0.22
- User pays (Standard): ~32 Sparks ($0.32)
- User pays (Pro): ~24 Sparks ($0.24)

**Note on margin**: The 2x margin in code applies to microdollars. 1 Spark = $0.01 = 10,000 microdollars. Provider cost of $0.02 = 20,000 micros × 2.0 margin = 40,000 micros = 4 Sparks = $0.04 user cost. The margin is exactly 2x in real dollars.

### AI Chat & Game Generation (OpenRouter)

LLM costs for the AI game builder chat, where users describe games and the AI creates them.

| Tier | Model | Cost per Step | Max Budget per Run | Use Case |
|------|-------|---------------|-------------------|----------|
| **Free** | GPT-4o-mini | $0.005 | $0.05 (5 Sparks) | Basic game generation |
| **Standard** | GPT-4o | $0.02 | $0.20 (20 Sparks) | Enhanced generation |
| **Pro** | Claude Sonnet 4 | $0.05 | $0.50 (50 Sparks) | Best quality generation |

**Token pricing (per 1M tokens via OpenRouter)**:

| Model | Input | Output | Typical Use |
|-------|-------|--------|-------------|
| GPT-4o-mini | $0.15 | $0.60 | Fast/cheap generation |
| GPT-4o | $2.50 | $10.00 | Balanced quality |
| Claude Sonnet 4 | $3.00 | $15.00 | Premium quality |
| Kimi K2 (reasoning) | $0.60 | $2.40 | Complex logic tasks |

**Typical conversation cost** (game generation session, ~5 turns):
- Free tier: $0.02-0.05
- Pro tier: $0.10-0.25

### Live Voice for Party Games (OpenAI Realtime + ElevenLabs)

Party games use real-time voice for host narration and player interaction.

| Component | Provider | Cost | Notes |
|-----------|----------|------|-------|
| **Live transcription** | OpenAI Whisper | $0.006/min | Speech-to-text for player input |
| **Real-time voice relay** | OpenAI Realtime API | ~$0.06/min input, $0.24/min output | AI host/narrator voice |
| **Sound effects** | ElevenLabs SFX | ~$0.01/generation | Cached in R2 after first gen |
| **TTS (announcements)** | ElevenLabs | ~$0.003/1K characters | Pre-generated, cached |

**Cost per party game session** (30-minute session, 6 players):
- Voice relay (AI host active ~10 min): $0.60-2.40
- Player transcription (30 sec per player per round × 10 rounds): $0.18
- Sound effects (pre-cached): ~$0.00 (amortized)
- **Total voice cost per session: ~$1.00-3.00**
- **Per player per session: ~$0.17-0.50**

**This is the highest per-session cost.** Mitigation: Pre-generate common voice lines, cache aggressively, use cheaper TTS models for non-critical audio.

### Pre-Generation Costs (Game Asset Pipeline)

When a game is created, assets are pre-generated so games load instantly for players.

| Step | Provider | Cost | Cached? |
|------|----------|------|---------|
| LLM game definition | OpenRouter | $0.02-0.25 | Yes (per game version) |
| Entity sprites (×5 avg) | Scenario.com | $0.10 | Yes (content-addressed in R2) |
| Background | Scenario.com | $0.02 | Yes |
| Sound effects (×3 avg) | ElevenLabs | $0.03 | Yes |
| Theme assets (UI) | Scenario.com | $0.06 | Yes (shared across games with same theme) |
| **Total pre-gen cost** | | **$0.23-0.46** | **All cached — one-time cost per game** |

Content-addressed storage (BlobStore → R2) means identical assets are never generated twice. As the platform grows, cache hit rate increases and per-game costs decrease.

### Infrastructure (Cloudflare)

| Service | Cost | Monthly at 25K MAU |
|---------|------|--------------------|
| **Workers (compute)** | $5/mo base + $0.30/M requests | ~$50 |
| **Durable Objects** (party rooms, voice relay) | $12.50/M GB-seconds | ~$200 |
| **D1 Database** | $0.001/M reads, $1.00/M writes | ~$30 |
| **R2 Storage** | $0.015/GB-month, $0 egress | ~$50 |
| **Total infrastructure** | | **~$330/mo at 25K MAU** |

**Key advantage**: Cloudflare charges $0 for bandwidth egress. For a game platform serving assets and WebSocket connections, this saves thousands/month vs. AWS.

### Payment Processing

| Channel | Fee | Impact |
|---------|-----|--------|
| **Stripe (web)** | 2.9% + $0.30 | Best channel — only ~6% effective rate on $9.99 |
| **Apple App Store** | 15% (Small Business) or 30% | Worst channel — avoid for subscriptions if possible |
| **Google Play** | 15% (first $1M) or 30% | Similar to Apple |

**Strategy**: Drive web subscriptions via Stripe (Apple Pay). At $9.99/mo:
- Web (Stripe): Platform keeps $9.10 (91%)
- Mobile (Apple 15%): Platform keeps $8.49 (85%)
- Mobile (Apple 30%): Platform keeps $6.99 (70%)

---

## Part 4: Revenue Streams — Where Money Comes From

### Stream 1: Pro Subscriptions

The primary revenue driver. Target 10% of MAU converting to Pro.

| What Drives Conversion | Mechanism |
|------------------------|-----------|
| Unlimited party hosting | Free users cap at 3/mo |
| Monthly Spark refill | 1,000 Sparks/mo ($10 value) |
| Discounted AI generation | 1.5x margin vs 2x |
| Priority generation queue | Faster asset creation |
| Cloud sync (offline) | Play anywhere |
| Better revenue split | 85/15 vs 80/20 on asset store |

### Stream 2: Spark Purchases (À La Carte)

For users who want more AI generation without committing to Pro.

| Pack | Price | Sparks | $/Spark | Bonus |
|------|-------|--------|---------|-------|
| Starter | $0.99 | 50 | $0.0198 | — |
| Creator | $4.99 | 275 | $0.0181 | 10% |
| Studio | $19.99 | 1,200 | $0.0166 | 20% |

**Higher packs give volume discounts** — incentivizes larger purchases. All packs are priced so 1 Spark ≈ $0.01-0.02, maintaining the mental model.

### Stream 3: Asset Store Take Rate

Platform takes 15-20% of every asset sale.

| Seller Type | Creator Gets | Platform Gets |
|-------------|-------------|---------------|
| Free-tier creator | 80% | **20%** |
| Pro subscriber creator | 85% | **15%** |

**What's sold**: Sprite packs ($0.50-2.00), sound packs ($0.50-2.00), game templates ($2.00-5.00), theme packs ($1.00-3.00).

**Assets are priced in Sparks** — this creates demand for Sparks and keeps the economy unified.

### Stream 4: Creator Engagement Revenue Pool

**30% of net subscription revenue** is distributed to creators based on engagement minutes.

```
creator_payout = (creator_engagement_minutes / total_engagement_minutes) × pool_size
```

| Scale | Pro Subs | Monthly Pool | Top 10 Creators | Top 100 Creators |
|-------|----------|-------------|-----------------|------------------|
| 10K MAU | 1,000 | $2,100 | ~$100/mo each | ~$10/mo each |
| 50K MAU | 5,000 | $10,500 | ~$500/mo each | ~$50/mo each |
| 100K MAU | 10,000 | $21,000 | ~$1,000/mo each | ~$100/mo each |
| 500K MAU | 50,000 | $105,000 | ~$5,000/mo each | ~$500/mo each |

**Why engagement minutes, not play counts**: Prevents click-farming, rewards games people actually enjoy spending time in.

**Industry comp**: Roblox pays creators ~29% of revenue. YouTube pays 55%. 30% is competitive while keeping platform economics healthy.

---

## Part 5: First-Party Games (The Netflix Model)

### The Tension

The founder builds template games (Flappy Bird, Breakout, Snake, Ball Sort, etc.). These are the initial catalog that attracts players. But they can't compete with third-party creators — that would be the "Amazon Basics" problem (platform competing with its own sellers).

### Resolution: Templates, Not Products

| Principle | Implementation |
|-----------|----------------|
| First-party games are **forkable templates** | Labeled "Template" in UI, one-click "Remix this game" |
| Templates don't earn from the engagement pool | Signals the pool is for creators, not self-dealing |
| Templates fill genre gaps | As creators cover a genre, founder stops making that genre |
| Templates demonstrate AI tool capability | "This was built with the same tools you have" |
| Templates are the "Remix" on-ramp | Player plays template → remixes it → becomes a creator |

### Transition Timeline

| Phase | First-Party Content | Creator Content |
|-------|--------------------|-----------------| 
| Launch (<1K creators) | 80% of catalog | 20% |
| Growth (1K-10K creators) | 20% of catalog | 80% |
| Scale (>10K creators) | <5% (toolkit focus) | 95%+ |

The founder's real product is the **AI creation tool**, not the games. Template games exist to demonstrate what the tool can do and give players something to fork.

---

## Part 6: Cold Start Strategy

The flywheel needs to spin up in sequence.

### Phase 1: Content + Players (Months 1-3)

| Action | Purpose | Target |
|--------|---------|--------|
| 8-12 polished template games across genres | Bootstrap the catalog | Enough variety to retain |
| Party mode as primary growth engine | Viral acquisition (4-8 friends per session) | 1K MAU |
| $10 signup grant (1,000 Sparks) | Convert players to creators | 50 games created/week |
| "Remix this game" prominent in UI | Lower creator barrier | 5% player → creator rate |

### Phase 2: Creator Onboarding (Months 3-6)

| Action | Purpose | Target |
|--------|---------|--------|
| Featured creator program (10-20 hand-picked) | Seed creator economy with evangelists | Quality benchmarks |
| Spark grants for featured creators | Remove cost barrier for early creators | Creator retention |
| Asset store beta (founder assets free + creator assets) | Kickstart marketplace | 50 asset listings |
| | | 5K MAU, 200 creators |

### Phase 3: Economic Flywheel (Months 6-12)

| Action | Purpose | Target |
|--------|---------|--------|
| Launch engagement revenue pool | Creators start earning real money | Creator growth |
| Pro subscription launch | Primary revenue stream | 10% conversion |
| Asset store opens to all creators | Marketplace network effects | $10K/mo GMV |
| | | 25K MAU, 1K creators |

### Phase 4: Scale (Year 2+)

| Action | Purpose | Target |
|--------|---------|--------|
| Creator success stories drive organic acquisition | Self-sustaining growth | PR + word of mouth |
| Founder reduces first-party output | Community fills gaps | <5% first-party content |
| Enterprise/education vertical | New market segment | Additional revenue stream |
| | | 100K+ MAU |

---

## Part 7: Full Financial Model

### Revenue Model at Steady State (50K MAU)

**Assumptions**: 10% Pro conversion, 5% Spark purchasers at $8 avg, asset store $25K GMV/mo

```
REVENUE                                           MONTHLY        ANNUAL
─────────────────────────────────────────────────────────────────────────
Pro Subscriptions (5,000 × $9.99)                  $49,950       $599,400
  Less: Stripe fees (6%)                           –$2,997       –$35,964
  Less: Creator pool (30% of net)                 –$14,086      –$169,031
  NET SUBSCRIPTION REVENUE                         $32,867       $394,405

Spark Purchases (2,500 × $8.00 avg)                $20,000       $240,000
  Less: Payment processing (6%)                    –$1,200       –$14,400
  NET SPARK REVENUE                                $18,800       $225,600

Asset Store GMV                                    $25,000       $300,000
  Platform take (18% blended)                       $4,500        $54,000
  NET ASSET STORE REVENUE                           $4,500        $54,000

TOTAL NET REVENUE                                  $56,167       $674,005
```

### Cost Model at Steady State (50K MAU)

```
COSTS                                              MONTHLY        ANNUAL
─────────────────────────────────────────────────────────────────────────
AI Image Generation (Scenario.com)
  Est. 50K images/mo × $0.02                       $1,000        $12,000

AI Chat/LLM (OpenRouter)
  Est. 10K sessions/mo × $0.05 avg                   $500         $6,000

Voice (Party Games)
  Est. 5K sessions/mo × $1.50 avg                  $7,500        $90,000

Sound Effects (ElevenLabs)
  Est. 5K generations/mo × $0.01                       $50           $600

Infrastructure (Cloudflare)
  Workers + DOs + D1 + R2                             $500         $6,000

Creator Engagement Payouts                         $14,086       $169,031

Asset Store Creator Payouts (82% of $25K GMV)      $20,500       $246,000

TOTAL COSTS                                        $44,136       $529,631
```

### Profit Summary

```
                                                   MONTHLY        ANNUAL
─────────────────────────────────────────────────────────────────────────
Total Net Revenue                                  $56,167       $674,005
Total Costs                                        $44,136       $529,631
─────────────────────────────────────────────────────────────────────────
GROSS PROFIT                                       $12,031       $144,374
GROSS MARGIN                                           21%            21%

Excluding creator payouts:
Platform Operating Profit                          $46,617       $559,405
Platform Operating Margin                              83%            83%
```

**Note**: Gross margin is 21% including creator payouts (the Roblox model — creators are a cost of revenue). Excluding creator payouts, the platform's operating margin on its own services is 83%, comparable to SaaS.

### Cost Breakdown Visualization

```
Where Every Dollar of Revenue Goes (at 50K MAU):

  ███████████████████████████████░░░░░░░░░░░░  Creator Payouts    62%
  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Voice/Party         13%
  ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Payment Processing   7%
  █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  AI Generation        3%
  █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Infrastructure       1%
  ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  PLATFORM PROFIT     14%
```

**The biggest cost is creator payouts** — this is intentional and healthy. A platform that pays creators well attracts more creators, which drives the flywheel.

**Voice/Party is the second biggest cost** — this is the main operational concern to optimize. Pre-caching voice lines and using cheaper TTS models for non-critical audio will reduce this over time.

---

## Part 8: Risks & Flywheel Killers

### 🔴 Critical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Party mode doesn't convert** — players treat it as a novelty, never return | Viral loop dies, no organic growth | Post-party follow-up, persistent game history, async party modes |
| **AI quality plateaus** — generated games feel samey or low-quality | Creators disengage, players leave | Template variety, manual editing support, quality scoring for discovery |
| **Player → Creator conversion is <2%** | Flywheel never spins up | Optimize "Remix" UX, guided creation flows, lower Spark costs |

### 🟡 Moderate Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **App Store tax** (15-30% on IAP) | Compresses all margins | Drive web subscriptions via Stripe/Apple Pay |
| **AI provider price increases** | Margin compression on Sparks | 2x margin gives buffer; diversify providers; consider self-hosted |
| **Marketplace pollution** (low-quality assets) | Discovery becomes impossible | Automated quality scoring, curated collections, reputation system |
| **Voice costs scale poorly** | Party mode becomes unprofitable | Pre-cache common lines, use cheaper TTS, rate limit free party sessions |

### 🟢 Manageable Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Creator economics too thin early** | Vocal critics | Lead with tools + audience value, not money. Be transparent about scale-dependent payouts |
| **Dual currency confusion** (Sparks + Gems) | User confusion | Simplify: Sparks = creation. Gems = social. Clear labeling |
| **Founder burnout on templates** | Content gap | Transition plan explicitly reduces first-party output as creator ecosystem grows |

---

## Part 9: Key Decisions (To Finalize)

| Decision | Recommended | Alternative | Impact |
|----------|-------------|-------------|--------|
| **Monthly stipend amount** | 1,000 Sparks ($10.00) | 500 Sparks ($5.00) | 100% vs 50% value-back ratio |
| **Stipend model** | Refill to 1,500 threshold | Hard cap at $25 | UX: no "lost credit" complaints |
| **Free party hosting limit** | 3 games/month | 0 (Pro only) | Growth vs monetization tradeoff |
| **Creator revenue pool %** | 30% of sub revenue | 20% or 40% | Creator attractiveness vs margin |
| **Asset store split** | 80/20 (85/15 Pro) | 70/30 (industry standard) | Creator attractiveness |
| **Pro generation discount** | 1.5x margin (vs 2x standard) | Same for all | Incentivizes Pro + increases credit utilization |
| **Voice in free party sessions** | Basic TTS only | Full AI voice | Cost control for free tier |
| **Signup grant** | 1,000 Sparks ($10.00) | 500 Sparks ($5.00) | More generous = higher player→creator conversion |

---

## Appendix A: Currency Reference

```
1 Spark = $0.01 = 10,000 microdollars
100 Sparks = $1.00
1,000 Sparks = $10.00

1 Gem ≈ $0.01 (social currency, not directly purchasable at 1:1)

Pro subscription: $9.99/mo = 1,000 Sparks/mo stipend
```

## Appendix B: Provider Reference

| Provider | Service | Pricing Model |
|----------|---------|---------------|
| **Scenario.com** | Image generation (sprites, backgrounds) | ~$0.02/image |
| **OpenRouter** | LLM gateway (GPT-4o, Claude, etc.) | Per-token, varies by model |
| **ElevenLabs** | SFX generation, TTS | Per-character / per-generation |
| **OpenAI Realtime** | Live voice relay | ~$0.06-0.30/min |
| **Cloudflare Workers** | Compute, API hosting | $0.30/M requests |
| **Cloudflare D1** | Database (SQLite) | $0.001/M reads |
| **Cloudflare R2** | Object storage (assets) | $0.015/GB, $0 egress |
| **Cloudflare DOs** | Stateful party rooms | $12.50/M GB-seconds |
| **Stripe** | Web payments | 2.9% + $0.30 |
| **RevenueCat** | Mobile IAP abstraction | Per-transaction fee |

## Appendix C: Comparable Platform Economics

| Platform | Revenue Model | Creator Share | Take Rate |
|----------|--------------|---------------|-----------|
| **Roblox** | Robux currency + Premium sub ($9.99) | ~29% of revenue | ~71% |
| **Rec Room** | Tokens + RR+ sub ($7.99) | Variable | ~70% |
| **Epic/Fortnite** | V-Bucks + Crew sub ($11.99) | Engagement payouts | ~80% |
| **Steam** | Game sales | 70% to developer | 30% |
| **Unity Asset Store** | Asset sales | 70% to seller | 30% |
| **Slopcade** | Sparks + Pro sub ($9.99) + Asset Store | 80-85% on assets + 30% engagement pool | 15-20% store + 70% sub |
