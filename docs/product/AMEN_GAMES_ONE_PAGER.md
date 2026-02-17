# Amen — Bible Party Games

**Scripture. Fellowship. Fun.**

amen.games | support@amen.games

---

## The Problem

300,000 US churches run youth groups, family nights, and fellowship events every week. Their options for interactive group entertainment are secular party games (Jackbox, Kahoot) that require content screening, or outdated Bible trivia apps built for solo play. There is no digital party game platform designed specifically for church groups playing together.

## The Product

**Amen is Jackbox Games for churches.** A host casts the game to a TV or projector. Players join on their phones by entering a 4-digit room code at amen.games. No app download required to play. 8+ party games ship at launch, all grounded in scripture:

| Game | Format | What Players Do |
|------|--------|-----------------|
| **The Great Hall of Wisdom** | Trivia | Race to answer Bible knowledge questions |
| **The Fellowship Table** | Quiplash | Write the funniest faith-themed fill-in-the-blank |
| **Scrolls of Truth** | Fibbage | Spot the real obscure Bible fact among the fakes |
| **The Book of Ages** | Timeline | Guess when biblical events happened |
| **Illustrated Scripture** | Drawing | Draw Bible scenes, guess what others drew |
| **Who Am I?** | Heads Up | Guess the Bible character from clues |
| **The Crossroads** | Dilemmas | Debate "would you rather" moral scenarios |
| **The Council** | Ranking | Rank Bible topics and see how your group compares |

All content is AI-generated, scripture-referenced, theologically reviewed, and ecumenically safe across Catholic, Protestant, and Orthodox traditions. Nothing mocking, nothing divisive, nothing a pastor wouldn't show on screen.

## The Audience

| Segment | Entry Point | Why They Buy |
|---------|-------------|--------------|
| **Youth Pastors** | Wednesday night game time | Need engaging tools that keep students off their phones (by putting the game ON their phones) |
| **Family Ministry Directors** | Church-wide fellowship events | Need scalable group activities for 20-200 people |
| **Christian Families** | Family game night / devotionals | Want faith-based alternatives to secular entertainment |
| **Homeschool Co-ops** | Bible study icebreakers | Need educational games that reinforce scripture |

**Primary buyer**: Youth pastors. They're the earliest tech adopters in churches, always searching for engagement tools, and active in online communities where word-of-mouth spreads fast.

**Total addressable market**: ~170M US Christians. **Serviceable**: ~300,000 US congregations with active youth or fellowship programs.

## The Business Model

### Church Subscriptions (Primary Revenue)

Flat-rate annual pricing by congregation size, following the church SaaS industry standard (RightNow Media, Kahoot EDU). No per-seat billing — one subscription covers the entire congregation.

| Tier | Attendance | Annual | Monthly |
|------|-----------|--------|---------|
| Small | Up to 100 | $199/yr | $24/mo |
| Medium | 101-500 | $499/yr | $59/mo |
| Large | 501-2,000 | $999/yr | $119/mo |
| Mega | 2,000+ | Custom | Custom |

### Individual Subscriptions (Secondary Revenue)

| Tier | Price | Access |
|------|-------|--------|
| Free | $0 | 2 game sessions/week |
| Amen+ | $4.99/mo or $39.99/yr | Unlimited games, all game types |

### Year 1 Revenue Projections

| Scenario | Churches | Avg Tier | Church ARR | Individual Subs | Individual ARR | **Total ARR** |
|----------|---------|----------|-----------|----------------|---------------|--------------|
| Conservative | 50 | Small ($199) | $9,950 | 500 | $20,000 | **$29,950** |
| Optimistic | 200 | Medium ($499) | $99,800 | 2,000 | $80,000 | **$179,800** |

### Cost Structure

Near-zero marginal costs. Infrastructure runs on Cloudflare Workers ($0 egress, fractions of a penny per session). Content is AI-generated once and cached forever. No dedicated game servers — all rendering happens on the player's device.

| Item | Monthly Cost at 50K MAU |
|------|------------------------|
| Cloudflare (Workers + D1 + R2) | ~$500 |
| AI content generation (one-time) | ~$200 |
| Supabase (auth) | ~$25 |
| **Total infrastructure** | **~$725/mo** |

Payment processing: Stripe on web (3%) is preferred. Apple Small Business Program (15%) for iOS. We drive web subscriptions with Apple Pay via Stripe for the best of both worlds — Apple Pay UX with 3% fees instead of 30%.

## Competitive Landscape

| Competitor | What They Do | Gap We Fill |
|-----------|-------------|-------------|
| **Jackbox Games** | Secular party games | No Christian content, inappropriate for churches |
| **TruPlay Games** | Christian mobile games | Single-player only, no party/group play |
| **Biblia Trivia** | Bible quiz app | Trivia only, one game type, no group experience |
| **Kahoot** | Quiz platform | Generic tool, not designed for scripture engagement |
| **Cards Christians Like** | Physical card game | No digital, no remote play, one game type |

**Our unique position**: The only digital party game platform with multiple game types designed specifically for church groups playing together. Nothing else in the market combines Jackbox's party format with curated Christian content.

## How It Works

```
1. Host picks a game on a laptop/tablet connected to a TV
2. A 4-digit room code appears on screen
3. Players open amen.games on their phones and enter the code
4. Everyone plays together — the TV shows the action, phones are controllers
5. Compete, laugh, learn, and discuss
```

No app download required for web play. Native iOS and Android apps also available. Supports 2-12+ players per session with an "Audience Mode" for larger gatherings.

## The Technology

Amen is a white-labeled product built on the Slopcade platform — a physics-based game engine and AI-powered game creation tool. Amen users have zero awareness of Slopcade: separate domain, separate accounts, separate app store listings, separate branding. One shared backend.

- **Multiplayer**: Cloudflare Durable Objects manage real-time WebSocket game state
- **Game logic**: Server-authoritative QuickJS sandbox (no cheating possible)
- **Content**: AI-generated from scripture databases (API.Bible, Theographic), validated for theological accuracy
- **Rendering**: React Native + Skia on phones (lightweight controllers), with Godot engine upgrade planned for the host display (animated reveals, sound effects, shader transitions)
- **Auth**: Supabase (Google, Apple Sign-In, Email/Password)
- **Billing**: Stripe (web) + RevenueCat (iOS/Android IAP)

## Content & Tone

Amen's content voice is **warm, educational, and reverent** — fun but never mocking:

| Slopcade | Amen |
|----------|------|
| "DESTROYED!" | "The race isn't over yet!" |
| "CHAMPION!" | "Well done, good and faithful servant!" |
| Neon, glitch, chaos | Gold, deep blue, warm cream |
| Edgy internet humor | Clean, clever, wholesome |

Content follows a strict denominational safety framework:
- **Green Zone**: Old Testament narratives, life of Jesus, Psalms, Christian virtues, Ten Commandments
- **Red Zone** (never generated): Predestination vs. free will, baptism methods, end times theology, papal authority, or any topic that divides denominations

12,500+ content items across 10 content packs at launch, all scripture-referenced and theologically reviewed.

## Go-to-Market

**Easter 2026 (April 5)** target launch. Positioning for Easter week game nights and post-Easter retention.

| Channel | Timing | Cost |
|---------|--------|------|
| Youth pastor Facebook groups & Instagram | Pre-launch | Free |
| Influencer outreach (50+ youth ministry creators identified) | Weeks 4-6 | Free (product) |
| Church partner program (founding churches get 50% off Year 1) | Launch | Revenue sacrifice |
| Landing page + email waitlist at amen.games | Now | $0 |
| Christian blogger/podcaster outreach | Launch week | Free |

**Launch promotion**: 14-day free trial for all church plans. First 50 churches get 50% off Year 1.

## Launch Metrics (Targets)

| Metric | Week 1 | Month 1 |
|--------|--------|---------|
| App downloads | 500 | 3,000 |
| Registered users | 200 | 1,500 |
| Game sessions played | 100 | 1,000 |
| Church org registrations | 10 | 50 |
| Paid church subscriptions | 3 | 15 |
| App Store rating | 4.5+ | 4.5+ |
| Day 7 retention | 30% | 30% |

## Why Now

- **86% of church leaders** say technology is vital for community connection
- Church tech budgets are growing (2-5% of annual budget, $10k-$25k for mid-sized churches)
- Christian media is surging (The Chosen: 700M+ views) — demand for faith-based digital experiences is at an all-time high
- AI content generation makes it possible to build 12,500+ theologically-reviewed content items as a solo founder — this was cost-prohibitive 2 years ago
- The party game format (Jackbox) is proven and beloved — churches just need a version they can actually use

## The Team

Solo technical founder with AI agents as the engineering force multiplier. The Slopcade platform (game engine, party infrastructure, AI pipeline, billing, auth) is built and working. Amen is a brand layer on proven infrastructure — the core party game system has 99 passing tests across 9 test suites with production-ready Durable Object infrastructure.

---

*"For where two or three are gathered in my name, there am I among them." — Matthew 18:20*
