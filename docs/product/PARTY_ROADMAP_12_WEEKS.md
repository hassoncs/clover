# Party System — 12-Week Roadmap

> **Start date**: Feb 17, 2026
> **End date**: May 11, 2026
> **Primary goal**: Launch amen.games for Easter (Apr 5), then iterate toward Godot host + game builder
> **Team model**: You (product decisions, manual testing, external setup) + AI agents (engineering)
> **Companion doc**: [Party System Vision](./PARTY_SYSTEM_VISION.md)

---

## Where We Are Today (Week 0)

### What's Built and Working
- Party infrastructure: Durable Objects, Hibernation API, 4-digit room codes, WebSocket protocol
- 99 passing tests across 9 test files
- Rate limiting (5 rooms/min/IP), collision detection with retry
- 3 fully playable games: Crowd Comedy, Chroma Clues, Punchline Duel (hidden)
- Player input components: text, buzzer, vote, wheel, drawing (Skia), mic, investment, matching
- Default phase renderers: answering, reveal, voting, round_results, scores, winner
- Brand system: `packages/brands/` with amen manifest (theme, auth config, content policy)
- Content pipeline CLI: ingest, generate, moderate, build-pack
- 10 amen content packs: trivia, quip, fibbage, history, drawing, ranking, dilemma, headsup, easter-special, good-friday
- Production readiness report, scaling analysis

### What's Not Built
- Amen Supabase project (auth) — human setup task
- Stripe products (billing) — human setup task
- 5 of 8 amen launch games need phase renderers for non-default phases
- Quiplash server script is missing (empty scripts dir)
- HeadsUp game needs everything from scratch
- No Godot on host display (MVP ships without it)
- No user-facing game editor for party games
- App store listings, screenshots, review submission

### Key Risk
We're late in the Easter planning cycle. Churches plan Easter activities in Jan-Feb. We're positioning for Easter week game nights and post-Easter retention, not formal Easter programming.

---

## The 12 Weeks

### Phase 1: MVP Launch (Weeks 1-4) — "Playable on Easter Sunday"

The only goal: 8 party games running on amen.games, playable on real phones, hosted from a laptop cast to a TV.

---

#### Week 1 (Feb 17-23): Infrastructure Validation

**Engineering**
- [ ] Deploy API to production (`pnpm --filter @slopcade/api release`)
- [ ] Push D1 schema to remote (`pnpm --filter @slopcade/api db:push:remote`)
- [ ] Manual E2E test: host on laptop → players on phones → play Crowd Comedy through completion
- [ ] Fix any WebSocket connection issues (CORS, URL routing, auth token flow)
- [ ] Add Punchline Duel to `AVAILABLE_GAMES` in the UI (instant win — game is fully built)
- [ ] Write server script for Quiplash (it's the most popular format and the script is missing)
- [ ] QuickJS interrupt handler for `while(true){}` protection (P0 security gap)

**You (Human)**
- [ ] Create amen Supabase project, configure OAuth providers, set redirect URLs
- [ ] Store Supabase credentials in deployment secrets
- [ ] Test with Jessica (Jesskia) — her phone joins your hosted game. Note every friction point.

**Exit criteria**: Crowd Comedy, Punchline Duel, and Chroma Clues playable in production with 3+ real devices.

---

#### Week 2 (Feb 24 - Mar 2): Game Sprint — First 4 Games

**Engineering**
- [ ] Game 1 — Quickfire Q&A ("The Great Hall of Wisdom"): server script exists, needs phase renderer for `question` phase (multiple choice buttons, not text input). Wire amen trivia content pack.
- [ ] Game 2 — Quiplash ("The Fellowship Table"): write server script (crowd-comedy is the reference — same answer/vote flow but head-to-head pairing). Wire amen quip content pack.
- [ ] Game 3 — Truth Trap ("Scrolls of Truth"): server script exists, needs phase renderer for `writing_lies` phase (fibbage-style: one truth, fake answers). Wire amen fibbage content pack.
- [ ] Game 4 — Year Jinx ("The Book of Ages"): server script exists, needs phase renderer for `guessing` phase (number input instead of text). Wire amen history content pack.
- [ ] Add all 4 to `AVAILABLE_GAMES`
- [ ] Run each game end-to-end with content packs loaded

**You (Human)**
- [ ] Play-test each game with 2-3 people as they're completed
- [ ] Note content quality issues — flag any theological problems

**Exit criteria**: 7 playable games (Crowd Comedy, Punchline Duel, Chroma Clues, Quickfire QA, Quiplash, Truth Trap, Year Jinx).

---

#### Week 3 (Mar 3-9): Game Sprint — Last 4 Games + Content QA

**Engineering**
- [ ] Game 5 — Consensus Mine ("The Council"): server script exists, needs renderers for `survey` and `team_turns` phases. Wire amen ranking content pack.
- [ ] Game 6 — Half and Half ("The Crossroads"): server script exists, needs renderer for `drafting` phase (write second half of dilemma). Wire amen dilemma content pack.
- [ ] Game 7 — Drawful Animate ("Illustrated Scripture"): server script exists, drawing canvas already built (Skia DrawingInput). Needs renderer for `drawing_f1`/`drawing_f2` and `bluffing` phases. Wire amen drawing content pack.
- [ ] Game 8 — HeadsUp ("Who Am I?"): needs everything — write server script, define phases, build phone-tilt or button-based correct/pass UI. Wire amen headsup content pack.
- [ ] Content moderation pass: run `pnpm content cli -- moderate` on all amen packs
- [ ] Scale content to 500+ items per game type where under target

**You (Human)**
- [ ] AI theological review pass on generated content
- [ ] Manually spot-check 50-100 items across packs
- [ ] Decide final game names (The Crossroads vs The Mediator, etc.)

**Exit criteria**: All 8 games playable with real content. Content reviewed for theological safety.

---

#### Week 4 (Mar 10-16): Polish, Deploy, Test

**Engineering**
- [ ] Host screen polish: room code displayed large and clear, player list readable from 10ft, "cast to TV" friendly layout
- [ ] Player join flow polish: room code entry should be dead simple, auto-focus on code field, keyboard number pad
- [ ] Error handling: graceful reconnection if WebSocket drops, "game ended" screen, host disconnect message
- [ ] Loading states: skeleton screens while waiting for game to start, phase transitions don't flash blank
- [ ] Sound: add basic phase transition sounds (can be simple — chime for new phase, applause for winner). Use Web Audio API or expo-av, nothing fancy.
- [ ] Deploy web app to Cloudflare Pages (`pnpm ship web`)
- [ ] Full E2E test on amen.games domain with 5+ concurrent players

**You (Human)**
- [ ] Create Stripe products for amen subscriptions (individual + church tiers)
- [ ] Register App Store listings (Apple + Google)
- [ ] Generate app icon and splash screen
- [ ] First TestFlight build: `BRAND_ID=amen eas build --profile amen-preview --platform ios`
- [ ] Pilot test with 1-2 church/family groups

**Exit criteria**: amen.games playable in production browser. TestFlight build available. Pilot feedback collected.

---

### Phase 1.5: Easter Launch (Weeks 5-7) — "Ship It, Watch It, Fix It"

---

#### Week 5 (Mar 17-23): Pre-Launch Hardening

**Engineering**
- [ ] Fix all issues from pilot testing
- [ ] Seasonal content: verify Easter Special pack activates (pack-scheduler.ts, Mar 30 - Apr 6)
- [ ] Rate limiting review: confirm abuse prevention is adequate for public launch
- [ ] Monitoring: add basic error tracking (Cloudflare dashboard, or Sentry if needed)
- [ ] Performance test: simulate 10+ concurrent rooms (can be scripted via WebSocket test client)
- [ ] Offline resilience: if API is slow, do phones timeout gracefully?

**You (Human)**
- [ ] Take App Store screenshots on real devices
- [ ] Submit iOS and Android for review (allow 3-5 days)
- [ ] Set up social media accounts (@amengames)
- [ ] Send pre-launch outreach to 5-10 youth pastors

**Exit criteria**: App submitted to stores. Zero known P0 bugs. Easter content verified.

---

#### Week 6 (Mar 24-30): Holy Week Soft Launch

**Engineering**
- [ ] Fix any App Store review rejections
- [ ] Hot-fix pipeline ready: `pnpm --filter @slopcade/api release` deploys in under 2 minutes
- [ ] Monitor error rates, WebSocket connection success, game completion rates
- [ ] On-call for critical bugs

**You (Human)**
- [ ] Holy Week social media: daily posts, Bible trivia clips
- [ ] Share with pilot groups, early adopters
- [ ] Monitor crash rates, respond to first App Store reviews

---

#### Week 7 (Mar 31 - Apr 6): EASTER LAUNCH

**Engineering**
- [ ] Easter Sunday: verify all systems operational
- [ ] Monitor KPIs: downloads, signups, game sessions, rooms created
- [ ] Hot-fix anything that breaks under real load

**You (Human)**
- [ ] Easter Sunday push: "Celebrate with your church tonight"
- [ ] Monitor downloads, ratings, feedback
- [ ] Collect retention metrics: Day 1, Day 3, Day 7

**Exit criteria**: amen.games live in App Store and web. Real churches playing games. No fires.

---

### Phase 2: Godot Host Display (Weeks 8-10) — "Make the TV Screen Fun"

Now that the product is live and people are playing, the host screen needs to stop looking like a wireframe. This is the single highest-impact upgrade for the party experience.

---

#### Week 8 (Apr 7-13): Godot Host Integration Architecture

**Engineering**
- [ ] Build the `PartyGodotHost` component: wraps `GameRuntimeGodot`, receives `sharedData` updates over WebSocket, renders Godot scenes per phase
- [ ] Define `hostRendering` field in game manifest: maps phase names to `"godot"` or `"react-native"`
- [ ] Build a single reference Godot scene: the "answer reveal" — cards slide in, flip to show answers, sound plays. This proves the integration works.
- [ ] Lazy loading: Godot only loads when the first `"godot"` phase is needed. React Native lobby stays as-is.
- [ ] Update `PartyGameRenderer` to check role + phase rendering config and route to either React Native component or Godot scene

**Architecture decisions**
- Godot host receives state updates only (not game logic — that stays server-side in the DO)
- Godot scenes are declarative: "show these answers with this animation" — not "run this game"
- Sound effects play from Godot (AudioManager already exists in the engine)

**Exit criteria**: One game (Crowd Comedy) has a Godot host reveal phase that looks meaningfully better than React Native.

---

#### Week 9 (Apr 14-20): Godot Scenes for Core Phases

**Engineering**
- [ ] Build shared Godot phase scenes:
  - `lobby_scene`: room code in large text, animated player avatars joining, ambient music
  - `answering_scene`: prompt displayed with timer animation, "players are writing..." with pen animation
  - `reveal_scene`: answers slide/flip in with sound effects
  - `voting_scene`: vote bars animate in real-time as votes come in
  - `scores_scene`: scoreboard with animated score changes, confetti for leader
  - `winner_scene`: champion celebration — confetti, fanfare, podium animation
- [ ] Wire these to Crowd Comedy and Quiplash as proof
- [ ] Generate sound effects via ElevenLabs SFX API (pipeline already exists)
- [ ] Generate visual assets via Scenario.com (backgrounds, card textures, particle textures)

**Exit criteria**: Crowd Comedy and Quiplash host displays run on Godot with animations and sound.

---

#### Week 10 (Apr 21-27): Godot Scenes for All 8 Games + Polish

**Engineering**
- [ ] Extend Godot host scenes to remaining 6 games
- [ ] Game-specific scenes where needed:
  - Year Jinx: animated timeline with guess markers
  - Drawful: animated frame viewer (flip between drawings)
  - HeadsUp: big character card with reveal animation
- [ ] Polish: transitions between scenes, consistent timing, no visual glitches
- [ ] Sound design pass: ensure every phase transition has audio feedback
- [ ] Deploy updated games to production
- [ ] A/B test possibility: some rooms get Godot host, some get React Native host — measure engagement difference

**You (Human)**
- [ ] Play-test with the Godot host on a real TV setup
- [ ] Feedback: does the Godot host make the experience feel like a "real game show"?

**Exit criteria**: All 8 games have Godot host display. The TV experience feels polished and fun.

---

### Phase 3: Platform & Growth (Weeks 11-12) — "Let Others Build"

---

#### Week 11 (Apr 28 - May 4): API Alignment + Game Builder Foundation

**Engineering**
- [ ] Converge game definition schemas: `manifest.json` party fields become a `party` section within `GameDefinition`. Single schema, dual runtime.
- [ ] Scripting API documentation: publish the `room.*` API reference (setPhase, requestInput, updateSharedData, etc.) so it's learnable
- [ ] Template system: create a "new party game" template in the editor that scaffolds manifest + server script + phase config
- [ ] Content pack authoring: simple UI for creating prompt/question lists (JSON editor or structured form)
- [ ] Phase renderer registration: document how to add custom phases so third-party games can have custom UI

**You (Human)**
- [ ] Decide: who gets access to the game builder first? Internal only? Beta testers? Open?
- [ ] Decide: can amen.games users build games, or is that slopcade-only?

**Exit criteria**: A developer (you or an AI agent) can create a new party game from template to playable in under 1 hour.

---

#### Week 12 (May 5-11): Team System + Second Wave Games

**Engineering**
- [ ] Team system: random/balanced team assignment, team-scoped broadcasts, team scoring. Unlocks a whole category of games.
- [ ] Audience role: spectators who can watch but not play (for large groups). Already partially implemented (Y5 fix).
- [ ] 4-6 additional games from the existing `r2/games/party/` inventory (there are 27 total — many have server scripts already)
- [ ] Host migration: if host disconnects, promote a player to host (or keep game running headless)

**You (Human)**
- [ ] Review post-launch metrics: which games are most played, where do players drop off
- [ ] Plan Wave 2 content generation based on player feedback
- [ ] Decide priority for Phase 3.5+: user-built games, Slopcade brand party games, or new game types

**Exit criteria**: Team games playable. 12+ total games available. Platform foundation for user-created games exists.

---

## Beyond Week 12 (Backlog)

These are queued but not scheduled. Priority based on user demand post-launch.

| Feature | Phase | Depends On |
|---------|-------|------------|
| Bracket/tournament engine | 3.5 | Team system |
| Hidden-role framework (Mafia-style) | 4 | Private messaging |
| Private messaging channels | 4 | Core infrastructure |
| Concurrent editing (collaborative canvas) | 4 | Drawing infrastructure |
| Mic-first games (sound challenges) | 4 | MicInput + moderation |
| Shared physics boards (hybrid games) | 4 | Godot host integration |
| Game marketplace / sharing | 5 | Game builder |
| Content marketplace | 5 | Content pack authoring |
| Rhythm/timing games | 5 | Advanced real-time sync |

---

## Success Metrics

### Easter Launch (Week 7)
- [ ] 8 games playable on amen.games
- [ ] 50+ game sessions played in first week
- [ ] 0 critical bugs in production
- [ ] App Store rating > 4.0

### End of 12 Weeks (Week 12)
- [ ] 12+ games available
- [ ] Godot host display on all games
- [ ] Game creation from template < 1 hour
- [ ] Team games working
- [ ] Post-Easter retention: 30%+ Day 7

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| App Store rejection | Medium | High (delays launch) | Submit early (Week 5), have 5 days buffer |
| Content theological issues | Low | Critical (brand damage) | AI moderation + human review + ecumenical policy |
| QuickJS infinite loop DoS | Medium | High (kills DO) | Interrupt handler in Week 1 |
| WebSocket reliability on mobile | Medium | Medium | Reconnection logic + graceful degradation |
| Low Easter adoption | High | Medium | Position for post-Easter, not Easter-only |
| Godot WASM load time on host | Low | Medium | Lazy load only for spectacle phases, RN fallback |
| Single-person bus factor | High | Critical | Document everything, AI agents as force multiplier |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Feb 17, 2026 | MVP ships without Godot on host | Faster to market. React Native host is functional if not flashy. |
| Feb 17, 2026 | Phones never load Godot for party games | Too heavy for controllers. Skia + RN is the right tool. |
| Feb 17, 2026 | Server-authoritative game logic stays in QuickJS | Correct for multiplayer. Never trust client devices. |
| Feb 17, 2026 | Phase 2 adds Godot to host only | Biggest bang for effort — TV display is where spectacle matters. |
| Feb 17, 2026 | Game builder deferred to Phase 3 | Launch first, iterate on tools later. |
