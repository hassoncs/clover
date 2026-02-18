# amen.games — Game Guide & Content Reference

## Architecture

Games are **engine templates** — each template defines a game mechanic. Brands (amen, slopcade) swap in their own **content** (questions, prompts) and **theming** (art, sounds, titles). Same engine, different skin.

Content packs are the raw material. A "quip" prompt like "The worst dish to bring to the Last Supper: _____" can power Quiplash (head-to-head), About You Bluff (personal truths), Role Replay (stay in character), etc. Same cards, different rules.

**21 game templates total. 10 content packs. 1,769 items.**

---

## Game Templates by Content Pack

### 🎤 `quip` — Fill-in-the-Blank Prompts (415 items)

Players write answers to prompts like "The 11th Commandment that didn't make the cut: _____"

| Template | Amen Title | Mechanic | Players |
|----------|-----------|---------|---------|
| `quiplash` | **The Fellowship Table** | Two players get same prompt, write answers, audience votes head-to-head | 3-8 |
| `half-and-half` | **The Mediator** | Fill in a scenario to split the room exactly 50/50 | 3-8 |
| `about-you-bluff` | **Testimony or Tale?** | One player answers truthfully, others write fakes. Guess the truth | 3-8 |
| `role-replay` | **Fruits of the Spirit** | Everyone gets a secret trait. Answer prompts in character. Guess traits | 3-8 |
| `ruin-and-redeem` | **Grace & Mischief** | "Ruin" a blessing, then "redeem" someone else's ruin. Vote on best | 3-8 |
| `chain-reaction` | **The Word Chain** | Word association chain. Challenge weak links. Vote on disputes | 2-8 |

---

### 📚 `trivia` — Multiple Choice Questions (490 items)

Questions like "Which apostle famously doubted the resurrection?" with 1 correct + 3 wrong answers.

| Template | Amen Title | Mechanic | Players |
|----------|-----------|---------|---------|
| `quickfire-qa` | **The Great Hall of Wisdom** | Speed trivia — faster correct answers score more. 3 rounds | 2-12 |

---

### 📜 `fibbage` — Obscure Facts with Blanks (137 items)

Fill-in-the-blank facts like "Shamgar killed 600 Philistines with an _____" (answer: oxgoad). Players write convincing fakes.

| Template | Amen Title | Mechanic | Players |
|----------|-----------|---------|---------|
| `truth-trap` | **Scrolls of Truth** | Write fake answers. Vote on which is real. Score for fooling others | 3-8 |

---

### 💰 `wager` — Number Estimation (166 items)

Questions like "How many wives did Solomon have?" where answer is a number (700).

| Template | Amen Title | Mechanic | Players |
|----------|-----------|---------|---------|
| `year-jinx` | **Solomon's Bet** | Everyone guesses a number. Guesses revealed on number line. Bet on closest | 1-8 |

---

### 🎨 `drawing` — Visual Prompts (200 items)

Prompts like "Jonah being launched out of the great fish" that players draw in 60 seconds.

| Template | Amen Title | Mechanic | Players |
|----------|-----------|---------|---------|
| `drawful-animate` | **Illustrated Scripture** | Draw TWO frames (loops as animation). Others write fake titles. Vote on real title | 3-8 |
| `sketch-bluff` | **Draw & Discern** | Draw the prompt. Others write fake titles. Vote on real title | 3-8 |

---

### 🏆 `ranking` — Rank 4 Items (148 items)

Topics like "Rank these Bible characters by who you'd want on a road trip" with 4 items to rank.

| Template | Amen Title | Mechanic | Players |
|----------|-----------|---------|---------|
| `consensus-mine` | **The Council** | Everyone secretly ranks 4 items. Teams guess the group's consensus. Predict the hive mind | 2-10 |

---

### 🙋 `headsup` — Word Guessing Decks (25 decks)

Decks of words (e.g., "Disciples" deck: Peter, John, Matthew...) for forehead-guessing.

| Template | Amen Title | Mechanic | Players |
|----------|-----------|---------|---------|
| `headsUp` | **Who Am I?** | Word on screen, one player faces away. Team gives clues. Race through words in 60 seconds | 2-12 |

---

### 🤷 `dilemma/wyr` — Would You Rather (110 items)

Choices like "Have Moses' staff for one day" vs "Have David's sling with perfect aim."

| Template | Amen Title | Mechanic | Players |
|----------|-----------|---------|---------|
| ⚠️ **No game template currently uses this content!** | — | — | — |

**Action needed**: Wire this to a game template, or create a simple "Would You Rather" game.

---

## Games WITHOUT Amen Content (need content packs created, or use hardcoded/no content)

| Template | Amen Title | Content Needed | Mechanic |
|----------|-----------|---------------|---------|
| `percent-panic` | **By the Numbers** | `percentage-facts` ⚠️ NOT CREATED | Higher/lower percentage guessing |
| `out-of-context` | **Parables Remixed** | `caption` ⚠️ NOT CREATED | Caption images, write fake contexts |
| `spectrum-guess` | **The Crossroads** | `NonsensoryScale` ⚠️ NOT CREATED | Slider/spectrum guessing |
| `lexicon-ladder` | **Lost Scrolls** | `FakeWord` (exists for slopcade) | Define fake words, use in sentences |
| `punchline-ferry` | **The Ark of Laughs** | `joke-template` ⚠️ NOT CREATED | Collaborative joke building with forced words |
| `chroma-clues` | **Stained Glass Clues** | None needed | Color guessing with word clues |
| `rival-roster` | **Saints & Scribes** | None needed | Drawing battle tournament |
| `shirt-clash` | **Design Thy Merch** | None needed | Draw icons + write slogans, random pairs, vote |

---

## Seasonal Packs

### 🐣 Easter Special (55 items across 8 game types)
**Not a separate game.** Mixed into regular games during Easter season via pack scheduler. Contains trivia, quip, fibbage, estimation, drawing, ranking, dilemma, and headsup items — all Easter-themed.

### ✝️ Good Friday (23 items across 3 game types)
Mixed in during Good Friday. More reflective/serious tone. Contains trivia, dilemma, and reflection prompts.

---

## Content Summary

| Pack | Items | Games Using It |
|------|-------|---------------|
| `quip` | 415 | 6 (Fellowship Table, The Mediator, Testimony or Tale?, Fruits of the Spirit, Grace & Mischief, The Word Chain) |
| `trivia` | 490 | 1 (The Great Hall of Wisdom) |
| `drawing` | 200 | 2 (Illustrated Scripture, Draw & Discern) |
| `wager` | 166 | 1 (Solomon's Bet) |
| `ranking` | 148 | 1 (The Council) |
| `fibbage` | 137 | 1 (Scrolls of Truth) |
| `dilemma` | 110 | ⚠️ 0 — needs a game |
| `headsup` | 25 decks | 1 (Who Am I?) |
| Easter | 55 | Seasonal overlay |
| Good Friday | 23 | Seasonal overlay |
| **TOTAL** | **1,769** | |

### Replayability

| Content Pack | Items Per Session | Unique Sessions Before Repeat |
|-------------|-------------------|------------------------------|
| Quip | ~12 prompts | **34** |
| Trivia | ~15 questions | **32** |
| Drawing | ~8 prompts | **25** |
| Wager | ~10 questions | **16** |
| Ranking | ~6 topics | **24** |
| Fibbage | ~7 questions | **19** |
| Heads Up | ~30 words | Varies by deck |

### Audio Needs Per Game Phase

Every game template has these common audio needs:
- **Lobby**: Background music while waiting for players
- **Answering/Writing**: Thinking music (light, 30-45 seconds)
- **Timer**: Countdown beeps for last 10 seconds
- **Voting**: Tension music
- **Reveal**: Dramatic reveal stinger
- **Scores**: Leaderboard music
- **Winner**: Victory fanfare

Game-specific audio:
- **Quiplash**: "VS" announcement for head-to-head reveals
- **Trivia**: "Correct!" ding, "Wrong!" buzzer, speed bonus sound
- **Fibbage**: "Fooled!" sound, "Truth found!" sound
- **Wager**: "Place your bets!" announcement, big number reveal
- **Drawing**: "Start drawing!" and "Pencils down!" announcements
- **Heads Up**: "Got it!" ding, "Pass!" buzzer, "Time's up!" horn
- **Ranking**: "The group has spoken!" announcement
