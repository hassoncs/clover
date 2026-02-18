# Slopcade Grand Strategy: Market Analysis & Revenue Projections

> **Date:** February 2026
> **Purpose:** Go-to-market analysis, revenue forecasting, and investor framing for the Slopcade platform across three business verticals.

---

## Executive Summary

Three distinct, stackable businesses built on one AI-powered game engine:

| Business Unit | Market | Year 5 Revenue Target (Conservative) |
|---|---|---|
| **amen.games** — "Jackbox for Churches" | Faith-Tech / Church SaaS | $3-6M ARR |
| **Slopcade Party** — "AI-Powered Jackbox Competitor" | Social/Party Gaming | $5-15M ARR |
| **Slopcade White-Label** — Branded Party Game Engine | Branded Entertainment | $2-8M ARR |
| **Combined** | | **$10-29M ARR** |

Near-zero COGS on content generation is the structural moat. Jackbox spends 12+ months per pack with a ~90-person team. Slopcade generates themed game packs in minutes.

---

## Part 1: amen.games — Faith-Based Party Games

### Market Sizing

| Layer | Size | Source |
|---|---|---|
| **TAM** — Global Religious App Market | $1.7B (2025) -> $3.5B (2033), 15.1% CAGR | HTF Market Intelligence |
| **SAM** — US Church Technology + Digital Content | ~$1.2B (Church Software) + $670M (Bible Study Platforms) | InfoTrend Pro, AskPot |
| **SOM** — US Churches buying engagement/entertainment tools | ~$50-100M addressable (churches spending on non-core engagement tech) | Derived |

**Key facts:**

- ~370,000 US congregations (332K Protestant, 23K Catholic, 15K other faith) — Hartford Institute
- Median church: 60 regular attendees. 70% of churchgoers attend churches with 100+ people
- Church tech budgets: ~15% of total budget (a $500K/yr church -> $75K tech budget)
- Net church closures slowing: 200 net closures in 2024 (down from 1,500 in 2019) — Lifeway Research
- 91% of churches now livestream worship services — Pushpay 2024 State of Church Technology

**Comparables:**

| Company | Revenue | Users/Reach | Model | Valuation |
|---|---|---|---|---|
| Pray.com | $11M (2024) -> ~$30M (2025) | 18M+ downloads, 100M podcast downloads | B2C Subscription | ~$100M |
| YouVersion (Bible App) | ~$7.5M (non-profit) | 1B+ installs | Free (Life.Church funded) | N/A |
| TruPlay (Christian gaming) | Venture-backed (undisclosed) | Family-focused | B2C Subscription | N/A |
| Planning Center (ChMS) | Est. $50M+ | Dominant ChMS | B2B SaaS (tiered by attendance) | Private |

**Existing faith-based gaming players:** TruPlay (kids games), Soma Games (Redwall series), Gate Zero (Bible exploration), IMD Interactive (The Anointed). None do party games.

### Current Pricing (Configured in Codebase)

#### Individual Tiers

| Tier | Monthly | Annual | Features |
|---|---|---|---|
| **Free** | $0 | $0 | 3 party hostings/mo, 4 players max, 80/20 creator split |
| **Amen+ (Pro)** | $4.99 | $39.99 | Unlimited hosting, 12 players max, 85/15 creator split, private assets, cloud sync |

#### Church (Organizational) Tiers

| Tier | Max Attendance | Monthly | Annual |
|---|---|---|---|
| **Small Church** | 100 | $24 | $199 |
| **Medium Church** | 500 | $59 | $499 |
| **Large Church** | 2,000 | $119 | $999 |

#### Spark (AI Credits) IAP Packs

| Pack | Price | Sparks | Bonus |
|---|---|---|---|
| Starter Pack | $0.99 | 50 | 0% |
| Creator Pack | $4.99 | 275 | 10% |
| Studio Pack | $19.99 | 1,200 | 20% |

Spark conversion: 1 Spark = $0.01. Signup bonus: 500 Sparks ($5.00 value).

### Revenue Projections

**Assumptions:** Easter 2026 launch with 8+ games. Blended church ARPA ~$350/yr. Individual ARPA ~$35/yr.

| Metric | Year 1 | Year 2 | Year 3 | Year 5 |
|---|---|---|---|---|
| **Churches (paid)** | 100-200 | 500-1,000 | 1,500-3,000 | 4,000-8,000 |
| **Individuals (paid)** | 500-1,500 | 3,000-8,000 | 10,000-25,000 | 30,000-75,000 |
| **Church ARR** | $35K-$70K | $175K-$350K | $525K-$1.05M | $1.4M-$2.8M |
| **Individual ARR** | $18K-$53K | $105K-$280K | $350K-$875K | $1.05M-$2.6M |
| **Spark IAP (est.)** | $5K-$15K | $25K-$75K | $75K-$200K | $200K-$500K |
| **Total ARR** | **$58K-$138K** | **$305K-$705K** | **$950K-$2.1M** | **$2.7M-$5.9M** |

**Penetration at Year 5:** 1-2% of US churches. Achievable given church software adoption rates (~40% of churches use digital giving platforms per Pushpay 2024 report).

### Marketing Strategy

| Channel | Budget (Mo 1-6) | Strategy | CAC Target |
|---|---|---|---|
| **Church Conferences** | $2K-5K/event | Demo booths at NYWC, Orange Conference, CMA | $50-100/church |
| **Facebook/Instagram Ads** | $1K-3K/mo | Target "youth pastor," "small group leader," "VBS" interests | $15-30/individual, $80-150/church |
| **YouTube** | $500-1K/mo | Demo videos: "Your youth group will LOSE IT over this" | Brand awareness |
| **Church Network Partnerships** | $0 (rev share) | Partner with CCLI, Planning Center, Pushpay for co-marketing | $0 CAC |
| **Word of Mouth / Referral** | $0 (built-in) | "Invite your church" flows. Free trial for referred churches | Viral loop |
| **Content Marketing** | $0 (AI-generated) | Blog: "52 Weeks of Youth Group Games," seasonal game packs | SEO/organic |

**The killer acquisition channel:** One youth pastor plays it at a conference -> brings it back -> 50 kids play -> 50 families hear about it -> individual subscriptions + church subscription. **The product IS the marketing.**

### Unit Economics

| Metric | Value |
|---|---|
| Content generation cost | ~$0 (AI-generated, own engine) |
| Hosting/infra per church | ~$2-5/mo (Cloudflare Workers) |
| Church LTV (3-year retention) | $600-$2,100 |
| Individual LTV (18-month avg) | $50-$70 |
| Target CAC (church) | <$150 |
| Target CAC (individual) | <$15 |
| Gross margin | **90%+** |

---

## Part 2: Slopcade Party — The AI Jackbox Killer

### Market Sizing

| Layer | Size | Source |
|---|---|---|
| **TAM** — Global Digital Party Game Market | $8.5B (2024) -> $15.9B (2033), 7.2% CAGR | Growth Market Reports |
| **SAM** — Social Gaming (PC/Mobile/Console) | $35.6B (2025) -> $80B (2031), 14.5% CAGR | Mordor Intelligence |
| **SOM** — Jackbox-style "group screen" party games | ~$100-300M (Jackbox ~$18-50M + copycats + mobile equivalents) | Derived |

### Jackbox Games Benchmark

| Metric | Value | Source |
|---|---|---|
| Estimated Annual Revenue | $18-50M | Growjo, LeadIQ, Owler |
| Lifetime Player Reach | 200M+ players | Jackbox official (2020) |
| Team Size | ~90-100 employees | Growjo |
| Packs Released | 11 Party Packs + standalone titles | Official |
| Pack Pricing | $24.99 (Packs 1-4) -> $29.99 (Packs 5-11) | Official |
| Games Per Pack | 5 (~$6/game effective) | Official |
| Monetization | One-time purchase (no recurring) | Official |
| Per-Pack Steam Revenue | $10-16M lifetime (established packs) | Raijin.gg, VG Insights |

**Other party/social game comparables:**

| Company | Revenue | Model | Key Insight |
|---|---|---|---|
| Among Us (Innersloth) | $275.8M (2024) | F2P + IAP | 74 employees. Social-viral ceiling is enormous |
| Kahoot! | $150M (2023 TTM) | B2B/B2C Subscription | $19/mo+ for business. Acquired for ~$1.7B |
| Buzztime (bar trivia) | $25M+ (pre-COVID) | B2B SaaS to bars | Venue-based entertainment model |

### Structural Advantages Over Jackbox

| Jackbox | Slopcade |
|---|---|
| 12-month dev cycle per 5-game pack | AI generates themed packs in minutes |
| $25-30 one-time purchase | $4.99/mo subscription (higher LTV) |
| Static games, fixed themes | Infinite themed variations |
| 90+ person team | AI content engine + solo developer |
| 5 games per pack | Unlimited games |
| One-time revenue, no recurring | Recurring subscription + IAP |

### Pricing Strategy

| Tier | Price | Positioning |
|---|---|---|
| **Free** | $0 | 3 games/mo, 4 players. Acquisition funnel |
| **Pro** | $4.99/mo / $39.99/yr | Unlimited games, 12 players, custom themes |
| **Spark Packs** | $0.99-$19.99 | AI generation credits for custom games |

### Revenue Projections

**Assumptions:** Launch Q3 2026. Distribution: Web + iOS + Android + Steam. Growth driven by virality (party games are inherently social-sharing).

| Metric | Year 1 | Year 2 | Year 3 | Year 5 |
|---|---|---|---|---|
| **MAU (Free)** | 10K-30K | 50K-150K | 200K-500K | 500K-2M |
| **Paid Subscribers** | 500-2,000 | 3,000-12,000 | 15,000-50,000 | 50,000-200,000 |
| **Subscriber ARR** | $18K-$72K | $108K-$432K | $540K-$1.8M | $1.8M-$7.2M |
| **Spark IAP** | $5K-$20K | $30K-$120K | $150K-$500K | $500K-$2M |
| **Total ARR** | **$23K-$92K** | **$138K-$552K** | **$690K-$2.3M** | **$2.3M-$9.2M** |

**Note:** These are conservative. Among Us hit $275M in a year with one game mechanic. The viral ceiling for party games is enormous but unpredictable. One TikTok moment could 10x these numbers overnight.

### Marketing Strategy

| Channel | Strategy |
|---|---|
| **TikTok/Reels** | Gameplay clips. Party games are inherently shareable ("watch my friends lose it") |
| **Twitch/YouTube streamers** | Party games = streaming content gold. Gifted keys / affiliate program |
| **Steam Discovery** | Launch sales, seasonal events, Steam Deck compatibility |
| **Cross-promotion from amen.games** | Youth group players discover the secular brand |
| **Reddit / Discord communities** | r/boardgames, r/partygames, game night Discord servers |

---

## Part 3: White-Label Branded Game Engine

### The Vision

The engine can re-theme any party game for any brand. The `BrandManifest` + `BrandTheme` architecture already supports this. Content restrictions, color palettes, AI voice/tone — all configurable per brand.

### Next Brands to Target (Ranked by Market Size & Feasibility)

| # | Brand Concept | Why It Works | IP Risk | Market Size |
|---|---|---|---|---|
| 1 | **Corporate Team Building** ("Kahoot meets Jackbox") | Companies pay $50-500/mo for team engagement. Kahoot does $150M/yr here | None | $5B+ (corporate training/engagement) |
| 2 | **Wedding/Event Entertainment** | Couples pay $50-200 for custom trivia about themselves | None | $70B US wedding market |
| 3 | **Bar Trivia / Restaurant Games** | Bars pay $100-300/mo for live trivia hosting. Replace Buzztime/Geeks Who Drink | None | $1B+ pub entertainment |
| 4 | **Sports Fan Games** ("Football Trivia Night") | Use public stats/history. Avoid league trademarks. "Football Trivia" not "NFL Trivia" | Low (public domain facts) | $25B fantasy/sports engagement |
| 5 | **Holiday/Seasonal Packs** | Themed game packs for Halloween, Christmas, July 4th, etc. | None | Evergreen upsell |
| 6 | **Education / Classroom** | Teachers use Kahoot ($150M rev). Party-game format more engaging | None | $8B edtech gamification |
| 7 | **Kids Birthday Parties** | Parents pay $20-50 for themed party game packs (Space, Dinosaurs, etc.) | Low (generic themes) | $15B children's party market |
| 8 | **Senior Living / Retirement** | Brain games, nostalgia trivia. Facilities pay for activity programs | None | $500M senior activity market |

### White-Label Revenue Model

| Model | Pricing | Target |
|---|---|---|
| **Self-serve SaaS** | $49-199/mo | Small businesses (bars, event planners) |
| **Enterprise license** | $5K-50K/yr | Corporations, franchise chains |
| **Custom build** | $10K-100K one-time + maintenance | Large brands wanting bespoke games |
| **Revenue share** | 70/30 split | Content creators making games on the platform |

### Year 5 White-Label Projection

| Segment | Customers | ARPA | ARR |
|---|---|---|---|
| Corporate/Team Building | 50-200 | $2,000/yr | $100K-$400K |
| Bars/Restaurants | 100-500 | $1,200/yr | $120K-$600K |
| Event Planners | 200-1,000 | $500/yr | $100K-$500K |
| Enterprise Deals | 5-20 | $25,000/yr | $125K-$500K |
| **Total** | | | **$445K-$2M** |

This is the hardest business to scale (B2B sales cycles) but the highest margin per deal.

---

## Part 4: Grand Strategy — Combined 5-Year View

### The Flywheel

```
AI Engine creates games --> amen.games proves product-market fit
                        --> Slopcade Party proves consumer virality
                        --> White-label proves B2B revenue
                        --> All three feed data back into better AI generation
                        --> More games, better games, lower CAC
```

### Combined Revenue Projection

| Year | amen.games | Slopcade Party | White-Label | **Total ARR** |
|---|---|---|---|---|
| **Year 1** | $58K-$138K | $23K-$92K | $0 | **$81K-$230K** |
| **Year 2** | $305K-$705K | $138K-$552K | $50K-$150K | **$493K-$1.4M** |
| **Year 3** | $950K-$2.1M | $690K-$2.3M | $200K-$600K | **$1.8M-$5.0M** |
| **Year 5** | $2.7M-$5.9M | $2.3M-$9.2M | $445K-$2M | **$5.4M-$17.1M** |

### Investor Framing

> "We built an AI engine that generates playable party games from a text prompt — complete with art, sound, and game logic — in minutes, not months. Jackbox takes a year and a 90-person team to ship 5 games. We generate infinite themed game packs for any audience: churches, corporate teams, bars, weddings. Our first vertical (faith-based) launches Easter 2026 with 8+ games and a proven pricing model. Our COGS is near-zero. Our gross margin is 90%+."

**Key metrics for fundraising:**

| Metric | Target for Seed ($1-2M) | Target for Series A ($5-10M) |
|---|---|---|
| ARR | $200K-$500K | $2M-$5M |
| Growth Rate | 3x YoY | 2.5x YoY |
| Paid Users | 1,000+ churches OR 5,000+ individuals | 3,000+ churches OR 50,000+ individuals |
| Gross Margin | 85%+ | 90%+ |
| CAC Payback | <6 months | <4 months |
| Net Revenue Retention | >110% | >120% |

### Burn Rate & Path to Profitability

Since content generation cost is essentially zero (AI engine + Cloudflare Workers), main costs are:

| Cost | Monthly |
|---|---|
| Cloudflare Workers/R2/D1 | $50-500 (scales with usage) |
| AI API costs (Scenario.com, ElevenLabs) | $200-2,000 |
| App Store fees (30% on IAP/subs) | Variable |
| Marketing spend | $2K-10K |
| Founder time (opportunity cost) | TBD |
| **Total monthly burn** | **$2.5K-$13K** |

**Breakeven point:** ~$5K-$15K MRR = 100-300 paid subscribers or 15-40 churches. Achievable within 6-12 months of launch.

---

## Part 5: Risks & Honest Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Churches are slow technology adopters | High | Conference demos, free trials, denominational partnerships |
| Party game virality is unpredictable | High | Multi-vertical strategy reduces dependence on any one hit |
| Jackbox releases a subscription model | Medium | AI generation moat remains — they can't match infinite content |
| App Store takes 30% | Medium | Push web-first for church subscriptions (Stripe direct) |
| AI-generated games feel generic | Medium | Curate flagship games manually, use AI for variations/themes |
| Church budget cycles are annual | Medium | Target spring/fall budget seasons. Offer monthly option |
| Solo developer / key-person risk | High | Engine architecture enables delegation; AI reduces labor needs |
| Market education required | Medium | "Jackbox for churches" is an instantly understood pitch |

---

## Part 6: Market Research Sources

| Data Point | Source | Date |
|---|---|---|
| Religious Studies App Market ($1.7B) | HTF Market Intelligence | 2025 |
| Church Software Market ($1.2B) | InfoTrend Pro via LinkedIn | 2024 |
| US Congregations (~370K) | Hartford Institute for Religion Research | 2023 |
| Church closures/openings | Lifeway Research | Jan 2026 |
| Pray.com revenue ($11M) | GetLatka | 2024 |
| Pray.com valuation (~$100M) | Starter Story | Nov 2024 |
| YouVersion installs (1B+) | YouVersion Official | Nov 2025 |
| Church tech adoption (91% livestream) | Pushpay State of Church Technology | Feb 2024 |
| Jackbox revenue ($18-50M est.) | Growjo, LeadIQ, Owler | 2024-2025 |
| Jackbox player reach (200M+) | Jackbox Games official | 2020 |
| Among Us revenue ($275.8M) | GetLatka | 2024 |
| Kahoot! revenue ($150M TTM) | CompaniesMarketCap | 2023 |
| Digital Party Game Market ($8.5B) | Growth Market Reports | 2024 |
| Social Gaming Market ($35.6B) | Mordor Intelligence | 2025 |
| Mobile Gaming Market ($134B) | Statista | 2026 |
| Gaming industry total ($300B+ by 2028) | PwC Global Entertainment Outlook | Jul 2024 |
| Church Management Software ($258M) | Straits Research | 2024 |

---

## Bottom Line

**amen.games alone** is a $3-6M ARR business at modest penetration (1-2% of US churches). **Slopcade Party** has the viral upside that could be much larger but is harder to predict. **White-label** is the long-tail B2B play. Combined, this is a realistic path to **$10-17M ARR within 5 years** without assuming any viral breakout moments. If one game catches fire on TikTok/Twitch, multiply the party game projections by 5-10x.

The near-zero marginal cost of content creation is the fundamental insight. The competition isn't on game quality — it's on **infinite themed supply at zero cost**, which is a category Jackbox structurally cannot enter.
