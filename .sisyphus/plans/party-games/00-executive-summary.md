# Party Games Platform — Executive Summary

## Where We Are Today

We have a **solid foundation** that's further along than it might seem. The core party game infrastructure is production-ready:

### What's Already Built & Working
| Component | Status | Details |
|-----------|--------|---------|
| **PartyRoomDO** (game server) | ✅ Production | Durable Object managing rooms, WebSocket sync, player connections, host assignment, reconnection |
| **Template Runner Pattern** | ✅ Production | Proven async game loop: `lobby → playing → ended` with phase-based state machine |
| **4 Input Types** | ✅ Production | `text`, `choice`, `drawing`, `buzzer` — all wired end-to-end |
| **Scoring/Leaderboard** | ✅ Production | `updatePlayerScore()` + `buildScoreboard()` pattern established |
| **Timer System** | ✅ Production | `startCountdown()` synced to all clients in real-time |
| **Content Pipeline CLI** | ✅ Production | AI generation (OpenRouter), moderation, SQLite storage, JSON pack export |
| **5 Content Schemas** | ✅ Ready to Generate | Quip prompts, Trivia, Drawing prompts, Would-You-Rather, Estimation |
| **3 Game Templates** | ✅ Live | Quiplash (paired head-to-head), Crowd Comedy (all-answer voting), Question Answer (basic Q&A) |
| **ElevenLabs Integration** | ✅ Production | Text-to-speech + sound effects generation |
| **Microphone Capture** | ✅ Production | Web + Native audio recording, WebSocket speech-to-text |
| **Drawing Canvas** | ✅ Production | Pixel buffer finger-painting system via Godot bridge |
| **Image Generation** | ✅ Production | Scenario.com pipeline for themed game assets |

### What's Partially Built
| Component | Status | Gap |
|-----------|--------|-----|
| **3 More Content Schemas** | Defined, not generating | Fibbage, Caption, Word Game — schemas exist in TypeScript, need generation prompts & pipelines |
| **Buzzer Input** | Basic | Needs speed/lockout/fairness UX for competitive speed rounds |
| **Drawing Templates** | Canvas works, no game template | `paint.tsx` example proves it works; need to wrap it in a party game template |
| **Audience Mode** | Feasible at small scale | Not tested or hardened for 100+ concurrent players |

### What Doesn't Exist Yet
| Component | Needed By | Complexity |
|-----------|-----------|------------|
| **Secret State / Hidden Roles** | Social deduction games (6+ games) | Medium — per-player payload filtering on WebSocket |
| **Team System** | Team-based games (4+ games) | Medium — team assignment, team scoring, team chat boundaries |
| **Bracket/Tournament Engine** | Design battles, comedy tournaments (3+ games) | Medium — elimination bracket + voting advancement |
| **Token Composer Input** | Word recycling games (2+ games) | Medium — select/rearrange words from constrained bank |
| **Private Messaging** | Social/dating games (2+ games) | Medium-High — secure DM channels within room |
| **Prediction/Betting System** | Estimation & tournament games (3+ games) | Medium — confidence wagers, margin-based payouts |
| **Concurrent Editing** | Collaborative text/canvas games (2+ games) | High — CRDT-lite for simultaneous multi-user input |
| **Auction/Economy Engine** | Auction games (1 game) | High — blind bids, loans, debt, net worth |
| **Mic Game Templates** | Audio recording games (3+ games) | High — capture → clip → playback → remix pipeline |
| **Real-time Physics Board** | Sorting/action games (2 games) | Very High — authoritative shared physics simulation |
| **RPG Combat Framework** | Trivia RPG (1 game) | Very High — persistent run state, classes, HP/damage |
| **Rhythm Timing Infrastructure** | Music game (1 game) | Very High — low-latency clock sync, device calibration |

---

## The Full Catalog: 50 Games Across 5 Waves

| Wave | Timeline | Games | What's Needed | Theme |
|------|----------|-------|---------------|-------|
| **Wave 1** | Week 1-2 | 3 | Content packs only | Refresh existing templates with new themes/prompts |
| **Wave 2** | Week 3-4 | 7 | Minor template tweaks | New round types, scoring variants, role mechanics |
| **Wave 3** | Month 2 | 14 | New templates, existing inputs | Bluffing, drawing, trivia, estimation, audio judging |
| **Wave 4** | Month 3 | 21 | New platform features | Social deduction, tournaments, concurrent editing, mic games |
| **Wave 5** | Month 4+ | 5 | Major infrastructure | Physics, RPG, rhythm, real-time action |
| **Total** | | **50** | | |

### Effort Breakdown
| Effort | Count | Hours Each | Total Hours |
|--------|-------|-----------|-------------|
| S (2-4h) | 3 | ~3h | ~9h |
| M (8-16h) | 12 | ~12h | ~144h |
| L (24-40h) | 18 | ~32h | ~576h |
| XL (40-80h) | 17 | ~60h | ~1,020h |
| **Total** | **50** | | **~1,750h** |

That's roughly **44 engineer-weeks** for the full catalog, or **~11 months** for one engineer working full-time. With a team of 2-3 focused engineers, the full catalog is achievable in **4-6 months**.

---

## How Far Are We From the Full Catalog?

### Realistic Assessment

**Wave 1 (3 games): Could ship THIS WEEK.**
These are just content refreshes on existing templates. Generate new prompt packs, tweak themes, done. The content pipeline is already built and working.

**Wave 2 (7 games): 2-3 weeks of work.**
Minor template modifications — adding round carryover, split-proximity scoring, elimination/re-entry. These are variations on the Quiplash/Crowd Comedy pattern we already have. Low risk.

**Wave 3 (14 games): 1-2 months of focused work.**
This is where it gets interesting. New templates but using existing input primitives. Fibbage (bluffing), Drawful (drawing + guessing), Tee K.O. (design tournaments), trivia variants, audio judging. Each is a self-contained template without major platform changes. **This is the highest-value wave** — 14 distinct game experiences using infrastructure we mostly already have.

**Wave 4 (21 games): 2-3 months of platform + game work.**
This requires building new platform capabilities FIRST (hidden roles, teams, brackets, mic templates, token composer), then building games on top. The platform work is reusable — building "hidden roles" once unlocks 6+ social deduction games. **This is where engineering investment compounds.**

**Wave 5 (5 games): 2-3 months of deep engineering.**
Major infrastructure: real-time physics boards, RPG combat frameworks, rhythm timing. These are technically impressive but each serves only 1-2 games. **Build these last** — they're the most expensive per-game.

### The 80/20 View

**Waves 1-3 (24 games) represent ~80% of the fun for ~30% of the engineering cost.** If you stopped after Wave 3, you'd have:
- 3 comedy/writing games (text-based)
- 3 bluffing games (Fibbage-style)
- 3 drawing games (Drawful/Tee K.O. style)
- 4 trivia variants (estimation, year-guessing, wheel, etc.)
- 3 audio/word/storytelling games
- Plus several hybrid experiences

That's a legit party game platform with serious variety.

---

## What Needs to Happen Next

### Immediate (This Week)
1. **Generate content packs** — Run the content pipeline to produce 200+ quip prompts, 500+ trivia questions, 100+ drawing prompts across varied categories
2. **Theme the existing 3 games** — Give Quiplash, Crowd Comedy, and Q&A original branding/themes
3. **Ship Wave 1** — These are free wins that prove the platform works

### Short-Term (Weeks 2-4)
4. **Build Wave 2 templates** — 7 games that are minor variations on existing patterns
5. **Activate Fibbage content pipeline** — Schema exists, wire up generation prompts and moderation
6. **Harden drawing template** — Take paint.tsx from example to production party game template

### Medium-Term (Month 2)
7. **Build Wave 3 templates** — 14 new game templates using existing input types
8. **Expand content pipeline** — Add word game, caption, and survey/estimation generation
9. **Build bracket engine** — Reusable tournament component for design battles and comedy tournaments

### Longer-Term (Month 3+)
10. **Build platform features** — Hidden roles, teams, private messaging, mic templates
11. **Build Wave 4 games** — Social deduction, tournaments, collaborative editing
12. **Build Wave 5 infrastructure** — Physics, RPG, rhythm (only if the catalog needs these flagship experiences)

### Content Pipeline Priority
The single highest-leverage thing to build next is **more content types in the pipeline**:

| Priority | Content Type | Unlocks |
|----------|-------------|---------|
| P0 | More quip/trivia packs | Wave 1 variety |
| P1 | Fibbage facts | Truth Trap, About You Bluff |
| P1 | Word mechanics | Clue Builder, Robo Rumble, Borrowed Words |
| P1 | Survey/estimation data | Percent Panic, Half & Half, Consensus Mine |
| P2 | Role/secret prompts | All social deduction games |
| P2 | Audio performance prompts | Sound Slam, Sound Remix, Slide Improv |
| P3 | Auction/economy cards | Auction Arena |

---

## Key Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Content quality/variety | Games feel repetitive if prompts are stale | Generate large pools (500+), rotate, add categories, enable player-submitted content |
| Drawing UX on phone | Finger drawing is inherently janky | Lean into it — the jank IS the fun (Drawful proved this). Keep canvas simple. |
| Real-time sync latency | Competitive speed rounds feel unfair | Server-authoritative timing, latency compensation, generous timing windows |
| Social deduction balance | Hidden roles are hard to balance | Start with simple 1-faker games, playtest heavily before adding complex multi-role games |
| Content moderation | Player-generated text can be toxic | Existing keyword blocklist + planned AI moderation layer. Add real-time filtering for party games. |
| Scope creep | 50 games is a LOT | Strict wave discipline — ship Wave 1-2 before touching Wave 3. Don't build infrastructure until games need it. |

---

## Bottom Line

We're **closer than you'd think**. The hardest part — real-time multiplayer infrastructure, WebSocket sync, content generation pipeline — is already built and proven. What's left is mostly **template work** (game logic) and **content generation** (prompts, facts, categories).

**If I had to pick the highest-impact next move**: generate a massive content library and ship Waves 1-2. That's 10 playable games in 2-3 weeks, using infrastructure that already exists. Everything after that is incremental — each new platform feature (hidden roles, brackets, teams) unlocks multiple games at once.

The full 50-game catalog is a 4-6 month journey for a small team, but you don't need 50 games to have a compelling product. **24 games (Waves 1-3) in 2 months** gives you a legitimate party game platform.
