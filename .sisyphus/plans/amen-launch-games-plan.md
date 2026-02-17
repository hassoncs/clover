# Amen Launch Games — Per-Game Build Plan

> **Goal**: Take each of the 8 Tier 1 amen.games party games from "idea + content packs" to fully playable games with entities, prefabs, images, physics, interactions, and sounds.
> **Generated**: Feb 16, 2026

---

## Current State Summary

### What's Done (across all games)

| Layer | Status | Details |
|-------|--------|---------|
| **Brand infrastructure** | ✅ Complete | `packages/brands/src/manifests/amen.ts` — theme colors, fonts, content policy, app IDs |
| **Content packs** | ✅ Complete | 10 JSON packs in `api/src/party/content/packs/amen/` — trivia, quip, fibbage, history, drawing, ranking, dilemma, headsup, easter-special, good-friday |
| **Content loader** | ✅ Complete | `prompt-loader.ts` loads brand-scoped packs with seasonal merge support |
| **Scripture validator** | ✅ Complete | Parses & validates all 66 Bible book references with abbreviations |
| **Manifest files** | ✅ Complete | All 8 games have `manifest.json` with `brands: ["amen", "slopcade"]` and `brandTitles` |
| **Server scripts** | ✅ 7/8 have `server.js` | headsUp has no scripts dir (only prefabs/placeholder.json) |

### What's NOT Done (the work ahead)

Each game needs to go from "manifest + server script + content JSON" → fully playable. This means:

1. **Visual assets** — background images, character sprites, UI elements themed to amen's visual identity (stained glass, warm gold, illuminated manuscripts)
2. **Entity definitions** — the actual game objects: question cards, answer buttons, score displays, timers, etc.
3. **Prefab definitions** — reusable entity archetypes for each game type
4. **Physics configuration** — where applicable (most party games are UI-driven, not physics-driven)
5. **Sound effects** — warm chimes, gentle feedback sounds, victory/reveal fanfares
6. **Interaction flows** — input handling, phase transitions, scoring animations

---

## APIs & Data Sources Status

### Required APIs

| API | Purpose | Status | Key Needed | Priority |
|-----|---------|--------|------------|----------|
| **OpenRouter** | AI content generation (trivia, quips, etc.) | ✅ Working | `OPENROUTER_API_KEY` (in hush vault?) | P0 |
| **API.Bible** (ABS) | Scripture text lookup, verse validation | ❌ Not integrated | Need to register at [scripture.api.bible](https://scripture.api.bible) for a free API key | P0 |
| **Theographic Bible Metadata** | Character/place knowledge graph | ⚠️ Adapter built, needs data file | No API key needed (GitHub JSON download) | P0 |
| **BibleQuizzle** | Seed trivia Q&A | ⚠️ Adapter built, needs data file | No API key (GitHub repo download) | P1 |
| **Church Calendar API (calapi)** | Liturgical calendar, feast days | ❌ Not integrated | TBD — may be free/no-key | P1 |
| **OpenBible Cross-References** | 340k+ verse connections | ❌ Not integrated | No key needed (public dataset) | P2 |
| **OpenBible Geocoding** | Bible place lat/long | ❌ Not integrated | No key needed (public dataset) | P2 |

### What You Need To Do Right Now (API Keys)

1. **API.Bible**: Go to https://scripture.api.bible → Register → Get free API key → Add to hush vault as `API_BIBLE_KEY`
2. **OpenRouter**: Verify `OPENROUTER_API_KEY` is in hush vault and has credit
3. **Theographic data**: Download JSON from https://github.com/robertrouse/theographic-bible-metadata — the adapter at `packages/content-pipeline/src/ingest/adapters/amen/theographic.ts` is ready to consume it
4. **BibleQuizzle data**: Download from its GitHub repo — adapter at `packages/content-pipeline/src/ingest/adapters/amen/biblequizzle.ts` is ready

### Content Pipeline Adapters Built

| Adapter | File | Status |
|---------|------|--------|
| Theographic | `packages/content-pipeline/src/ingest/adapters/amen/theographic.ts` | ✅ Code done, needs data file |
| BibleQuizzle | `packages/content-pipeline/src/ingest/adapters/amen/biblequizzle.ts` | ✅ Code done, needs data file |
| Scripture Validator | `packages/content-pipeline/src/ingest/adapters/amen/scripture-validator.ts` | ✅ Complete |

---

## Game-by-Game Build Plans

---

### Game 1: The Great Hall of Wisdom (Quickfire Q&A)

**Directory**: `r2/games/party/quickfire-qa/`
**Original**: Quickfire Q&A — fast-paced multiple choice trivia
**Amen Theme**: "The Great Hall of Wisdom" — stained glass, warm library
**Content Pack**: `amen:trivia` (✅ `amen-trivia.json` exists)

#### Current State
- ✅ `manifest.json` — phases: lobby → question → answering → reveal → scores
- ✅ `server.js` — server-side game logic
- ✅ `definition.json` / `metadata.json` — compiled outputs
- ❌ No entities/ or prefabs/ directories
- ❌ No visual assets

#### What Needs To Be Built

**Visual Assets Needed:**
- Background: Stained glass cathedral library — warm golden light, bookshelves with ancient tomes, leaded glass windows
- Question card: Parchment/scroll texture with gold borders
- Answer buttons (A/B/C/D): Illuminated manuscript-style letter badges
- Timer: Hourglass or candle burning down
- Score reveal: Golden chalice or crown iconography

**Entities:**
- `question-display` — shows the trivia question text
- `answer-option` (×4) — tappable answer buttons with A/B/C/D labels
- `timer-bar` — countdown indicator
- `score-display` — per-player scores
- `round-indicator` — "Round 1 of 3"
- `correct-answer-highlight` — green glow / gold sparkle on correct answer

**Sounds:**
- Question appear: Page turning / scroll unrolling
- Timer ticking: Gentle clock tick (last 5 seconds more urgent)
- Correct answer: Warm chime, angelic chord
- Wrong answer: Soft "hmm" tone (not harsh buzzer)
- Round complete: Bell toll
- Victory: Triumphant but warm fanfare

**Physics:** None — pure UI game

**Interaction Flow:**
1. Players see question + 4 answers on their devices
2. Tap to select answer (faster = more points)
3. Main screen reveals correct answer with explanation + scripture ref
4. Scores update → next question

---

### Game 2: The Fellowship Table (Quiplash)

**Directory**: `r2/games/party/quiplash/`
**Original**: Quiplash — fill-in-the-blank comedy, head-to-head voting
**Amen Theme**: "The Fellowship Table" — warm gathering, breaking bread
**Content Pack**: `amen:quip` (✅ `amen-quip.json` exists)

#### Current State
- ✅ `manifest.json` — has `requiresPartyMode: true`
- ⚠️ `scripts/` directory exists but is EMPTY (no server.js!)
- ✅ `entities/` and `prefabs/` directories exist (some structure)
- ✅ `definition.json` / `metadata.json`

#### What Needs To Be Built

**Critical**: Server script is missing! Need to write `server.js` for the quiplash game flow.

**Visual Assets Needed:**
- Background: Long wooden table with bread and candles, warm firelight, stone walls
- Prompt card: Handwritten scroll with blank space for answers
- VS screen: Two answers side by side on wooden placards
- Vote buttons: Thumbs up / "This one!" indicators
- Player avatar frames: Warm gold circular frames

**Entities:**
- `prompt-display` — shows the fill-in-the-blank prompt
- `text-input-area` — where players type their answers (phone side)
- `vs-display` — shows two competing answers side by side
- `vote-indicator` — which answer each player voted for
- `vote-meter` — percentage bar showing votes
- `score-display` — running totals
- `quiplash-banner` — special effect when someone wins unanimously

**Sounds:**
- New prompt: Warm bell chime
- Answers submitted: Quill scratch
- VS reveal: Dramatic but warm drum roll
- Vote tallying: Soft counting sounds
- Quiplash (unanimous): Triumphant choir hit
- Round end: Warm applause

**Physics:** None

**Interaction Flow:**
1. All players see same prompt, type their wittiest (wholesome) answer
2. Answers paired for head-to-head: audience votes
3. Votes revealed with percentages
4. Quiplash bonus if unanimous winner

---

### Game 3: Scrolls of Truth (Truth Trap / Fibbage)

**Directory**: `r2/games/party/truth-trap/`
**Original**: Truth Trap — write believable lies, spot the real fact
**Amen Theme**: "Scrolls of Truth" — ancient scrolls, candlelight
**Content Pack**: `amen:fibbage` (✅ `amen-fibbage.json` exists)

#### Current State
- ✅ `manifest.json` — phases: lobby → writing_lies → voting → reveal → scores → winner
- ✅ `server.js` — server-side logic
- ❌ No entities/ or prefabs/
- ❌ No visual assets

#### What Needs To Be Built

**Visual Assets Needed:**
- Background: Candlelit scriptorium with ancient scrolls, ink pots, wax seals
- Fact card: Aged parchment with "The truth is…" header and a blank
- Lie options: Individual scroll fragments that unroll
- Real fact highlight: Glowing gold seal of truth
- "Fooled" indicator: Playful "you fell for it!" with a gentle quill flourish

**Entities:**
- `fact-display` — shows the obscure Bible fact with a blank ("_____ was the shortest man in the Bible")
- `lie-input` — text field for writing convincing fake answers
- `answer-list` — all submitted lies + the real answer, shuffled
- `vote-selector` — tap which you think is real
- `reveal-animation` — scrolls that unroll to show who wrote what
- `fooled-counter` — how many people each lie fooled

**Sounds:**
- Fact presented: Scroll unrolling
- Writing phase: Quill scratching ambient
- All answers revealed: Wax seal breaking
- Voted for truth: Angelic "ahh"
- Fooled someone: Playful "gotcha" chime
- Real fact reveal: Grand revelation tone

**Physics:** None

**Interaction Flow:**
1. Everyone sees an obscure Bible fact with a key detail blanked out
2. Each player writes a convincing fake answer
3. All answers (fakes + real) shuffled and displayed
4. Players vote on which is real
5. Points for: guessing right, fooling others

---

### Game 4: The Book of Ages (Year Jinx)

**Directory**: `r2/games/party/year-jinx/`
**Original**: Year Jinx — guess the year of historical events
**Amen Theme**: "The Book of Ages" — illuminated manuscript timeline
**Content Pack**: `amen:history` (✅ `amen-history.json` exists)

#### Current State
- ✅ `manifest.json` — phases: lobby → round_start → guessing → reveal → scores → winner
- ✅ `server.js`
- ❌ No entities/ or prefabs/
- ❌ No visual assets

#### What Needs To Be Built

**Visual Assets Needed:**
- Background: Giant illuminated manuscript book, open to a timeline page, gold leaf
- Event card: Decorated manuscript page with the event description
- Number input: Roman numeral or medieval number styling
- Timeline: Horizontal scroll showing biblical/historical timeline with key markers
- Reveal: Event placed on the timeline with a golden pin

**Entities:**
- `event-display` — the historical/biblical event description
- `year-input` — number pad for guessing the year (or slider for approximate dates)
- `timeline-display` — visual timeline showing where guesses landed vs. reality
- `guess-markers` — each player's guess shown on timeline (color-coded)
- `distance-display` — how far off each player was
- `score-update` — closer = more points

**Sounds:**
- Event presented: Book page turning, heavy tome
- Guessing phase: Ticking clock (gentle)
- Reveal: Clock chime, timeline "whoosh"
- Close guess: Triumphant harp arpeggio
- Far off guess: Gentle "not quite" tone
- Perfect guess: Bells and choir

**Physics:** None

**Interaction Flow:**
1. Biblical/historical event described on screen
2. Each player enters their year guess on their phone
3. All guesses revealed on a timeline
4. Closest guess wins most points
5. "Jinx" bonus if two players guess same year

---

### Game 5: The Council (Consensus Mine)

**Directory**: `r2/games/party/consensus-mine/`
**Original**: Consensus Mine — predict group rankings/preferences
**Amen Theme**: "The Council" — gathering of disciples, consensus seeking
**Content Pack**: `amen:ranking` (✅ `amen-ranking.json` exists)

#### Current State
- ✅ `manifest.json` — phases: lobby → survey → team_turns → reveal_list → winner
- ✅ `server.js`
- ❌ No entities/ or prefabs/
- ❌ No visual assets

#### What Needs To Be Built

**Visual Assets Needed:**
- Background: Round stone table (think Last Supper / council of apostles), torchlit chamber
- Topic card: Proclamation scroll with wax seal
- Ranking list: Numbered stone tablets or clay tablets
- Reveal: Items flip from hidden to shown with golden light
- Team indicators: Different colored robes/cloaks

**Entities:**
- `topic-display` — "Rank these Bible characters by bravery" or "Which miracle would be most useful today?"
- `ranking-input` — drag-to-rank interface on phone
- `group-consensus` — the aggregated ranking from everyone's votes
- `team-guess-display` — which item the team is guessing is #1, #2, etc.
- `reveal-slot` — each position revealed with animation
- `trap-indicator` — if team picks a low-ranked item (penalty)

**Sounds:**
- Topic reveal: Stone tablet placed on table
- Ranking phase: Shuffling papers
- Team discussing: Quiet murmur ambience
- Correct high-rank guess: Trumpet flourish
- Trap (low-rank pick): Stone grinding / "uh oh" chime
- List fully revealed: Grand ceremonial tone

**Physics:** None

**Interaction Flow:**
1. Everyone privately ranks a list of items (e.g., "Rank these parables by how relatable they are")
2. Rankings aggregated into group consensus
3. Teams take turns guessing items from most popular to least
4. High-rank guesses earn points, low-rank picks are "traps" (lose points)

---

### Game 6: The Crossroads / The Mediator (Half and Half)

**Directory**: `r2/games/party/half-and-half/`
**Original**: Half and Half — split the room 50/50 on a dilemma
**Amen Theme**: "The Crossroads" (plan) / "The Mediator" (manifest) — ethical decision point
**Content Pack**: `amen:dilemma` via `amen-dilemma.json` (loaded as `wyr` / would-you-rather type)

> **Note**: Manifest says "The Mediator" but the master plan says "The Crossroads". Need to decide which name to use.

#### Current State
- ✅ `manifest.json` — phases: lobby → drafting → voting → reveal → scores → winner
- ✅ `server.js`
- ❌ No entities/ or prefabs/
- ❌ No visual assets

#### What Needs To Be Built

**Visual Assets Needed:**
- Background: A literal crossroads — two paths in a pastoral landscape, warm sunset, a signpost
- Dilemma card: Split-design card with two options, separated by a golden divider
- Vote bar: Two-sided meter that tips toward majority
- 50/50 celebration: Perfect balance animation (golden scales)
- Player split: Visual showing who chose which side

**Entities:**
- `dilemma-display` — the "Would you rather" style prompt
- `drafting-input` — player writes the second half of the dilemma
- `option-a` / `option-b` — the two choices displayed
- `vote-buttons` — A or B on phone
- `split-meter` — animated percentage bar showing the vote split
- `player-sides` — player avatars on each side of the crossroads
- `score-display` — closer to 50/50 = more points for the author

**Sounds:**
- Dilemma presented: Fork-in-the-road dramatic tone
- Voting: Quiet deliberation ambience
- Vote reveal: Dramatic scale-tipping sound
- Near 50/50: Exciting crescendo
- Perfect 50/50: Triumphant balanced chime + applause
- Lopsided result: Playful "wah wah" (gentle)

**Physics:** None

**Interaction Flow:**
1. Author gets a prompt stem, writes the completion to make it a tough dilemma
2. Room votes on the dilemma (Option A vs Option B)
3. Points awarded based on how close to 50/50 the split is
4. Perfect 50/50 = maximum points

---

### Game 7: Illustrated Scripture (Drawful Animate / Flicker Frames)

**Directory**: `r2/games/party/drawful-animate/`
**Original**: Flicker Frames — 2-frame animations, others guess the subject
**Amen Theme**: "Illustrated Scripture" — draw Bible scenes, guess what's depicted
**Content Pack**: `amen:drawing` (✅ `amen-drawing.json` exists)

#### Current State
- ✅ `manifest.json` — phases: lobby → drawing_f1 → drawing_f2 → bluffing → voting → reveal → scores → winner
- ✅ `server.js`
- ❌ No entities/ or prefabs/
- ❌ No visual assets

#### What Needs To Be Built

**Visual Assets Needed:**
- Background: Art studio / monk's illumination workshop — pigments, gold leaf, vellum
- Drawing canvas: Parchment-textured drawing surface
- Drawing tools: Quill/brush-style color palette (earth tones, golds, blues)
- Frame viewer: Ornate golden frame that alternates between the two drawings
- Title cards: Scroll-style placards for submitted titles

**Entities:**
- `prompt-display` — private prompt shown to artist ("Draw: Moses parting the Red Sea")
- `drawing-canvas` — full-screen drawing area on phone (frame 1, then frame 2)
- `animation-viewer` — main screen shows the 2-frame animation looping
- `title-input` — other players write fake titles
- `title-list` — all titles (fakes + real) displayed for voting
- `vote-selector` — pick which title is real
- `reveal` — artist and real title revealed

**Sounds:**
- Drawing phase: Soft brush strokes ambient
- Animation reveal: "Ta-da" with gentle harp
- Title submission: Quill writing
- Voting: Contemplative humming
- Correct guess: Warm bell
- Wrong guess: Gentle "oops"
- Artist fooled everyone: Dramatic manuscript flourish

**Physics:** None

**Interaction Flow:**
1. Each player gets a secret Bible scene prompt
2. Draw Frame 1 on phone → Draw Frame 2
3. Animation plays on main screen — others write fake titles
4. Everyone votes on which title is real
5. Points for: guessing correctly, fooling others with fake titles

---

### Game 8: Who Am I? (Heads Up)

**Directory**: `r2/games/party/headsUp/`
**Original**: Heads Up — word on forehead, ask yes/no questions
**Amen Theme**: "Who Am I?" — guess the Bible character
**Content Pack**: `amen:headsup` (✅ `amen-headsup.json` exists)

#### Current State
- ✅ `manifest.json` — basic structure, no party phases defined
- ⚠️ No `scripts/` directory at all — no server.js
- ⚠️ Only `prefabs/placeholder.json`
- ❌ No entities/
- ❌ No visual assets

#### What Needs To Be Built

**Critical**: This game is the LEAST built. Needs server script, game phases, and complete entity system from scratch.

**Visual Assets Needed:**
- Background: Ancient marketplace or town square — sandstone buildings, palm trees, biblical-era setting
- Character card: Large text on a scroll or stone tablet (the name to be guessed)
- Timer: Sundial or sand timer
- Category header: "Old Testament Kings", "New Testament Disciples", "Women of the Bible", etc.
- Correct/Pass indicators: Green checkmark (golden) / Red X (gentle)

**Entities:**
- `character-card` — large text display showing the Bible character name (visible to everyone except the guesser)
- `category-display` — which deck is being played ("Prophets", "Kings", "Apostles")
- `timer-display` — countdown for the round
- `correct-button` — "Got it!" button for the team
- `pass-button` — "Pass" button to skip
- `score-counter` — how many correct in this round
- `round-summary` — list of all characters, which were guessed vs passed

**Sounds:**
- Round start: Dramatic marketplace bustling
- Correct guess: Quick celebration chime
- Pass: Swift scroll sound
- Timer running low: Heartbeat or drum
- Round end: Bell toll
- Final scores: Triumphant fanfare

**Physics:** None — but may use device tilt for pass/correct gestures (tilt forward = correct, tilt back = pass)

**Interaction Flow:**
1. One player holds phone to forehead (or main screen shows the word)
2. Other players give yes/no clues
3. Guesser says the answer → team hits "Correct" or "Pass"
4. As many characters as possible in 60 seconds
5. Rotate who's guessing

---

## Cross-Game Shared Assets

These assets should be created once and reused across all 8 games:

### Shared Visual Assets
- **Amen logo** — for splash/loading screens
- **Background texture** — warm cream parchment (base layer for all games)
- **Gold border/frame** — reusable decorative frame for cards and displays
- **Player avatar frame** — golden circle frame for player icons
- **Score badge** — golden star or crown for score display
- **Loading spinner** — dove or cross animation

### Shared Sounds
- **Lobby music** — gentle hymn-inspired ambient loop
- **Phase transition** — warm chime between game phases
- **Player join** — welcome bell
- **Countdown (3-2-1)** — ascending chimes
- **Game over** — warm fanfare
- **Applause** — gentle group applause

### Shared UI Components
- **Answer button style** — gold-bordered, cream background, serif text
- **Timer bar** — gold fill on dark background
- **Score display** — player name + golden number

---

## Build Priority Order

| Priority | Game | Reason |
|----------|------|--------|
| 1 | **The Great Hall of Wisdom** (Quickfire Q&A) | Simplest game, best test bed — just show question + 4 buttons |
| 2 | **The Fellowship Table** (Quiplash) | Most popular party game format, but needs server.js written |
| 3 | **Scrolls of Truth** (Truth Trap) | Great for showcasing Bible facts |
| 4 | **The Book of Ages** (Year Jinx) | Simple estimation mechanic |
| 5 | **The Council** (Consensus Mine) | More complex team dynamics |
| 6 | **The Crossroads** (Half and Half) | Creative writing + voting |
| 7 | **Illustrated Scripture** (Drawful) | Requires drawing canvas infrastructure |
| 8 | **Who Am I?** (Heads Up) | Least infrastructure built, needs everything from scratch |

---

## Name Decision Needed

The master plan and the manifest disagree on Game 6's amen title:
- **Master plan**: "The Crossroads" — ethical decision point, warm lighting
- **Current manifest**: "The Mediator" — two sides, one deal

**Recommendation**: "The Crossroads" feels more evocative and fits the gameplay better (choosing between two paths). "The Mediator" sounds more like a negotiation game.

---

## Open Questions

1. **Are the existing server.js scripts brand-aware?** — Do they already load content from the brand-scoped packs, or do they need updates to pass `brandId` to `loadContentPack()`?
2. **Quiplash server.js is missing** — Was this intentional (WIP) or a gap? The entities/ and prefabs/ dirs exist but scripts/ is empty.
3. **Heads Up is very bare** — Just a placeholder prefab. Is there a reference implementation somewhere, or does this need to be built from scratch?
4. **Drawing canvas** — Is the drawing input infrastructure already built for other games, or does "Illustrated Scripture" need the canvas system built?
5. **Device tilt** — For "Who Am I?" (Heads Up), do we want tilt-to-pass/correct like the real Heads Up app?
