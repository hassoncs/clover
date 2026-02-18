# Amen Party Games: Screen Layouts (Batch 1)

> **Design Philosophy**: "Jackbox for the Fellowship Hall."
> Warm, inviting, premium but playful. Stained glass, illuminated manuscripts, and candlelit wood, but modernized with clean UI and snappy animations.

---

## 1. Shared Visual Language

**Color Palette**
- **Primary**: `Deep Blue #1B3A6B` (Headers, primary actions)
- **Secondary**: `Gold #C9A84C` (Accents, timers, winners, borders)
- **Accent**: `Purple #6B3FA0` (Bonus moments, streaks, special badges)
- **Background**: `Cream #FDF8F0` (Canvas for all screens)
- **Surface**: `White #FFFFFF` (Cards, panels, inputs)
- **Text**: `Charcoal #2D2D2D` (Body), `Grey #6B7280` (Secondary)
- **Status**: `Green #5B7F3B` (Success), `Burgundy #B84233` (Error/Urgent)

**Typography**
- **Headings**: `Lora` (Serif) — Used for game titles, phase headers, dramatic reveals.
- **Body/UI**: `Inter` (Sans) — Used for questions, answers, buttons, player names.

**Common UI Elements**
- **Timer Bar**: Top of Host screen. Gold fill that drains to Burgundy.
- **Phase Header**: Lora font, centered top. "Round 1 of 3".
- **Player Count**: Top-right corner (Host). "👥 6".
- **Score Ticker**: Bottom edge (Host). Scrolling marquee of player scores.

---

## 2. The Great Hall of Wisdom (Trivia)

**Design Brief**: A fast-paced trivia game set in a grand library. The focus is on the question card and the dramatic reveal of the correct answer. Needs to feel like a game show hosted by a wise librarian.

**Phase Flow**:
1. `Question` (5s) — Read time
2. `Answering` (20s) — Input time
3. `Reveal` (5s) — Answer shown
4. `Scores` (5s) — Leaderboard

### A. Question / Answering Phase

**Host Screen (TV)**
```text
+----------------------------------------------------------------+
|  [Gold Timer Bar: 75% remaining]                               |
|  Round 1 of 10                                            👥 8 |
|                                                                |
|  +----------------------------------------------------------+  |
|  |  [Card: White Surface, Gold Border]                      |  |
|  |                                                          |  |
|  |  What was the name of the garden where Adam and          |  |
|  |  Eve lived? (Genesis 2:8)                                |  |
|  |                                                          |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  +--------------------------+    +--------------------------+  |
|  | A. Garden of Gethsemane  |    | B. Garden of Babylon     |  |
|  +--------------------------+    +--------------------------+  |
|                                                                |
|  +--------------------------+    +--------------------------+  |
|  | C. Garden of Eden        |    | D. Garden of Peace       |  |
|  +--------------------------+    +--------------------------+  |
|                                                                |
| [Ticker: Sarah 1200 • Mike 1100 • Jen 950 • Tom 800 ... ]      |
+----------------------------------------------------------------+
```

**Phone Screen (Player)**
```text
+------------------+
|  [Timer: 15s]    |
|                  |
|  What was the    |
|  name of the     |
|  garden...       |
|                  |
| +--------------+ |
| | A. Gethsemane| |
| +--------------+ |
|                  |
| +--------------+ |
| | B. Babylon   | |
| +--------------+ |
|                  |
| +--------------+ |
| | C. Eden      | |
| +--------------+ |
|                  |
| +--------------+ |
| | D. Peace     | |
| +--------------+ |
|                  |
+------------------+
```

### B. Reveal Phase

**Host Screen (TV)**
```text
+----------------------------------------------------------------+
|  Round 1 of 10                                            👥 8 |
|                                                                |
|  +----------------------------------------------------------+  |
|  |  What was the name of the garden where Adam and          |  |
|  |  Eve lived? (Genesis 2:8)                                |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  +--------------------------+    +--------------------------+  |
|  | [Greyed Out]             |    | [Greyed Out]             |  |
|  | A. Garden of Gethsemane  |    | B. Garden of Babylon     |  |
|  +--------------------------+    +--------------------------+  |
|                                                                |
|  +==========================+    +--------------------------+  |
|  | [GREEN HIGHLIGHT + GLOW] |    | [Greyed Out]             |  |
|  | C. Garden of Eden        |    | D. Garden of Peace       |  |
|  | 3 Players (+1000)        |    |                          |  |
|  +==========================+    +--------------------------+  |
|                                                                |
| [Ticker: Sarah +1000 • Mike +0 • Jen +1000 • Tom +0 ... ]      |
+----------------------------------------------------------------+
```

**Phone Screen (Player)**
```text
+------------------+
|                  |
|    CORRECT!      |
|  [Green Check]   |
|                  |
|     +1000        |
|                  |
|  Streak: 🔥 3    |
|                  |
|  Look at the TV! |
|                  |
+------------------+
```

**Background Art**:
> "warm stained-glass church library, illuminated manuscript ornament, gold leaf trim, cream parchment, cinematic soft light, clean UI-safe composition"

**State Variations & Transitions**
- **Timer**: Bar changes color from Gold -> Burgundy as time runs out.
- **Selection**: Phone buttons turn Gold when selected, Grey when locked.
- **Reveal**: Correct answer flashes Green, others fade to 50% opacity.
- **Transition**: Cards slide in from bottom. Phase changes fade through black.

---

## 3. The Fellowship Table (Quiplash)

**Design Brief**: A warm, rowdy dinner table setting. The focus is on the user-generated text. The "VS" screen needs to feel like a friendly duel.

**Phase Flow**:
1. `Writing` (45s) — Players answer prompts
2. `Reveal` (3s) — Intro the matchup
3. `Voting` (20s) — Choose the best answer
4. `Results` (5s) — Show winner of the duel

### A. Writing Phase

**Host Screen (TV)**
```text
+----------------------------------------------------------------+
|  [Timer: 45s]                                                  |
|  Writing Phase                                            👥 6 |
|                                                                |
|           Check your device!                                   |
|                                                                |
|      +--------------------------------------------------+      |
|      |                                                  |      |
|      |  Write your funniest answers now!                |      |
|      |                                                  |      |
|      |  [Animation: Quills writing on scrolls]          |      |
|      |                                                  |      |
|      +--------------------------------------------------+      |
|                                                                |
|  [Progress: Sarah ✅ • Mike ... • Jen ✅ • Tom ... ]           |
+----------------------------------------------------------------+
```

**Phone Screen (Player)**
```text
+------------------+
|  Prompt 1 of 2   |
|                  |
| The church       |
| announcement     |
| nobody expected  |
| this Sunday:     |
|                  |
| [ Text Input   ] |
| [ Type here... ] |
|                  |
| [ SUBMIT ]       |
|                  |
+------------------+
```

### B. Voting Phase (The Duel)

**Host Screen (TV)**
```text
+----------------------------------------------------------------+
|  [Timer: 20s]                                                  |
|  The church announcement nobody expected this Sunday:          |
|                                                                |
|  +-----------------------+     +-----------------------+       |
|  |                       |     |                       |       |
|  | "Free Puppies in      |     | "Pastor is joining    |       |
|  |  the Narthex"         | VS  |  a heavy metal band"  |       |
|  |                       |     |                       |       |
|  |                       |     |                       |       |
|  +-----------------------+     +-----------------------+       |
|                                                                |
|               Vote on your device now!                         |
|                                                                |
+----------------------------------------------------------------+
```

**Phone Screen (Player)**
```text
+------------------+
|   VOTE NOW!      |
|                  |
| +--------------+ |
| | Free Puppies | |
| | in the       | |
| | Narthex      | |
| +--------------+ |
|                  |
|       OR         |
|                  |
| +--------------+ |
| | Pastor is    | |
| | joining a    | |
| | metal band   | |
| +--------------+ |
+------------------+
```

### C. Results Phase

**Host Screen (TV)**
```text
+----------------------------------------------------------------+
|  The church announcement nobody expected this Sunday:          |
|                                                                |
|  +-----------------------+     +-----------------------+       |
|  | [30%]                 |     | [70%]                 |       |
|  | "Free Puppies in      |     | "Pastor is joining    |       |
|  |  the Narthex"         |     |  a heavy metal band"  |       |
|  |                       |     |                       |       |
|  |       Sarah           |     |        Mike           |       |
|  +-----------------------+     +-----------------------+       |
|                                                                |
|                                     WINNER!                    |
|                                     +700 pts                   |
|                                                                |
+----------------------------------------------------------------+
```

**Background Art**:
> "warm candlelit fellowship hall, rustic wood table, illuminated manuscript accents, gold and cream UI framing, clean center-safe composition"

**State Variations & Transitions**
- **VS Reveal**: Left card slides in from left, Right from right. Crash effect in middle.
- **Voting**: Vote bars grow from 0% to final % over 2 seconds.
- **Winner**: Winning card scales up 1.2x, losing card fades/shrinks.
- **Transition**: "Next Matchup" wipes across screen like a page turn.

---

## 4. Scrolls of Truth (Fibbage)

**Design Brief**: A scriptorium/monastery vibe. The core mechanic is deception. The UI must clearly distinguish the "Blank" to be filled. The reveal needs to be suspenseful—peeling back the truth.

**Phase Flow**:
1. `Writing` (45s) — Write lies
2. `Voting` (20s) — Pick the truth
3. `Reveal` (10s) — Show truth + who wrote what

### A. Voting Phase

**Host Screen (TV)**
```text
+----------------------------------------------------------------+
|  [Timer: 20s]                                                  |
|  Find the Truth                                           👥 5 |
|                                                                |
|  The name of Moses' wife was __________. (Exodus 2:21)         |
|                                                                |
|  +----------------------------------------------------------+  |
|  |  A.  Sarah                                               |  |
|  +----------------------------------------------------------+  |
|  |  B.  Zipporah                                            |  |
|  +----------------------------------------------------------+  |
|  |  C.  Miriam                                              |  |
|  +----------------------------------------------------------+  |
|  |  D.  Rachel                                              |  |
|  +----------------------------------------------------------+  |
|  |  E.  Leah                                                |  |
|  +----------------------------------------------------------+  |
|                                                                |
+----------------------------------------------------------------+
```

**Phone Screen (Player)**
```text
+------------------+
|  Pick the Truth  |
|                  |
|  Moses' wife...  |
|                  |
| [ A. Sarah     ] |
| [ B. Zipporah  ] |
| [ C. Miriam    ] |
| [ D. Rachel    ] |
| [ E. Leah      ] |
|                  |
+------------------+
```

### B. Reveal Phase

**Host Screen (TV)**
```text
+----------------------------------------------------------------+
|  The Truth Revealed                                            |
|                                                                |
|  The name of Moses' wife was Zipporah.                         |
|                                                                |
|  +----------------------------------------------------------+  |
|  |  A.  Sarah                                               |  |
|  |      [Written by Mike]  (Fooled: Jen, Tom)               |  |
|  +----------------------------------------------------------+  |
|  |  B.  Zipporah  [TRUTH SEAL STAMPED HERE]                 |  |
|  |      [The Truth]        (Found by: Sarah)                |  |
|  +----------------------------------------------------------+  |
|  |  C.  Miriam                                              |  |
|  |      [Written by Jen]   (Fooled: Nobody)                 |  |
|  +----------------------------------------------------------+  |
|                                                                |
+----------------------------------------------------------------+
```

**Background Art**:
> "ancient scriptorium, parchment scrolls, wax seals, warm candle glow, Byzantine ornament, deep blue and gold accents"

**State Variations & Transitions**
- **Writing**: "Waiting for others..." pulse animation on phone after submit.
- **Reveal**: Truth is stamped with a Gold Seal animation (slam effect).
- **Lies**: Player names fade in under the lies they wrote.
- **Transition**: Scroll rolls up and new one unrolls for next phase.

---

## 5. Solomon's Bet (Wits & Wagers)

**Design Brief**: A royal judgment hall. Gold, grandeur, wisdom. The signature UI is the **Number Line** where guesses are sorted.

**Phase Flow**:
1. `Guessing` (30s) — Enter a number
2. `Betting` (20s) — Place chips on the number line
3. `Reveal` (10s) — Show answer + payouts

### A. Betting Phase

**Host Screen (TV)**
```text
+----------------------------------------------------------------+
|  [Timer: 20s]                                                  |
|  Place Your Bets!                                         👥 4 |
|                                                                |
|  How many chapters are in the book of Psalms?                  |
|                                                                |
|       [Mike]      [Jen]      [Sarah]      [Tom]                |
|         |           |           |           |                  |
|  <------+-----------+-----------+-----------+------>           |
|        100         120         150         200                 |
|                                                                |
|      (3:1)       (2:1)       (2:1)       (3:1)                 |
|                                                                |
|  [Chips appearing on guesses as players bet...]                |
|                                                                |
+----------------------------------------------------------------+
```

**Phone Screen (Player)**
```text
+------------------+
|  Place Bets      |
|  Tokens: 💰 2    |
|                  |
|  Tap a guess:    |
|                  |
|  [ 100 ] (Mike)  |
|  Payout: 3:1     |
|                  |
|  [ 120 ] (Jen)   |
|  Payout: 2:1     |
|                  |
|  [ 150 ] (Sarah) |
|  Payout: 2:1     |
|                  |
+------------------+
```

### B. Reveal Phase

**Host Screen (TV)**
```text
+----------------------------------------------------------------+
|  The Answer Is...                                              |
|                                                                |
|  How many chapters are in the book of Psalms?                  |
|                                                                |
|                     [WINNER!]                                  |
|                     [SEAL]                                     |
|                     [150]                                      |
|                       ^                                        |
|  <------+-----------+-|-+-----------+------>                   |
|        100         120|        150         200                 |
|                       |                                        |
|  Closest: Sarah (+500)|                                        |
|  Bets: Mike (Gold) -> Payout +600                              |
|                                                                |
+----------------------------------------------------------------+
```

**Background Art**:
> "ancient Israelite royal judgment chamber, polished stone, gold inlay, torchlit atmosphere, ceremonial game table, elegant readable UI zones"

**State Variations & Transitions**
- **Sorting**: Guesses slide along the number line to their correct sorted positions.
- **Betting**: Chips stack up on markers (3D stack effect).
- **Payout**: Coins flow from the "Bank" to winning players' avatars.
- **Transition**: Camera pans across the table to the next question scroll.
