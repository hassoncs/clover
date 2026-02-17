# Amen Party Games: Screen Layouts (Batch 2)

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

## 5. The Council (Ranking)

**Design Brief**: A solemn council chamber where opinions are law. The focus is on the hidden "Consensus List" that teams are trying to uncover. The vibe is cooperative debate punctuated by dramatic reveals of "Top 3" or "Trap" items.

**Phase Flow**:
1. `Survey` (60s) — Players rank items individually
2. `Team Turns` (Variable) — Teams alternate picking items
3. `Reveal` (5s) — Item rank revealed (Success/Trap)
4. `Winner` (10s) — Final list and winning team

### A. Survey Phase

**Host Screen (TV)**
```text
+----------------------------------------------------------------+
|  [Timer: 60s]                                                  |
|  The Council is in Session                                👥 8 |
|                                                                |
|  Topic: "Rank these Bible characters as road trip companions"  |
|                                                                |
|      +--------------------------------------------------+      |
|      |                                                  |      |
|      |  Check your device to rank the items!            |      |
|      |                                                  |      |
|      |  [Animation: Scrolls being unrolled/sorted]      |      |
|      |                                                  |      |
|      +--------------------------------------------------+      |
|                                                                |
|  [Progress: Diggers: 3/4 ✅ • Drillers: 2/4 ... ]              |
+----------------------------------------------------------------+
```

**Phone Screen (Player)**
```text
+------------------+
|  Rank Items      |
|  (Drag to move)  |
|                  |
| +--------------+ |
| | 1. David     | |
| +--------------+ |
| | 2. Paul      | |
| +--------------+ |
| | 3. Peter     | |
| +--------------+ |
| | 4. Esther    | |
| +--------------+ |
|                  |
| [ SUBMIT ]       |
|                  |
+------------------+
```

### B. Team Turns Phase

**Host Screen (TV)**
```text
+----------------------------------------------------------------+
|  Team Diggers' Turn                                       👥 8 |
|                                                                |
|  Topic: "Rank these Bible characters as road trip companions"  |
|                                                                |
|  [HIDDEN LIST BOARD]                                           |
|  +----------------------------------------------------------+  |
|  | 1. [HIDDEN - GOLD SLOT]                                  |  |
|  | 2. [HIDDEN - GOLD SLOT]                                  |  |
|  | 3. [HIDDEN - GOLD SLOT]                                  |  |
|  | 4. [HIDDEN - NEUTRAL]                                    |  |
|  | 5. [HIDDEN - NEUTRAL]                                    |  |
|  | 6. [HIDDEN - TRAP!]                                      |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  Lives: 💎💎💎 (Diggers)           Lives: 💎💎💎 (Drillers)    |
|  Score: 0                          Score: 0                    |
+----------------------------------------------------------------+
```

**Phone Screen (Player - Active Team)**
```text
+------------------+
|  Your Team's Turn|
|                  |
|  Pick a Top 3    |
|  Item!           |
|                  |
| [ David        ] |
| [ Paul         ] |
| [ Esther       ] |
| [ Peter        ] |
|                  |
|  Discuss with    |
|  your team!      |
+------------------+
```

### C. Reveal Phase (Success)

**Host Screen (TV)**
```text
+----------------------------------------------------------------+
|  The Council Has Spoken!                                       |
|                                                                |
|  Team Diggers picked: "David"                                  |
|                                                                |
|  +----------------------------------------------------------+  |
|  | 1. David  [REVEALED!] (+100 pts)                         |  |
|  |    [Consensus Rank: #1]                                  |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  [Animation: Gold light rays burst from the slot]              |
|                                                                |
|  Lives: 💎💎💎 (Diggers)           Lives: 💎💎💎 (Drillers)    |
|  Score: 100                        Score: 0                    |
+----------------------------------------------------------------+
```

**Background Art**:
> "apostolic council chamber, round table, warm torchlight, carved stone walls, gold accents, ornate parchment overlays, board-game readability"

**State Variations & Transitions**
- **Trap Reveal**: Slot cracks open with red light/dust effect. Life gem shatters.
- **Success**: Slot glows gold, angelic choir sound.
- **Transition**: Camera swoops from overhead table view to close-up of the list.

---

## 6. The Crossroads (Dilemma)

**Design Brief**: A fork in the road at twilight. The visual metaphor is the "Split" — the screen is physically divided. The drama comes from the percentage bar filling up to reveal the room's division.

**Phase Flow**:
1. `Present` (5s) — Host reads the dilemma
2. `Voting` (30s) — Players choose A or B
3. `Reveal` (10s) — Split percentage shown

### A. Voting Phase

**Host Screen (TV)**
```text
+----------------------------------------------------------------+
|  [Timer: 30s]                                                  |
|  The Crossroads                                           👥 6 |
|                                                                |
|  Would you rather...                                           |
|                                                                |
|  +-----------------------+  |  +-----------------------+       |
|  |                       |  |  |                       |       |
|  |      OPTION A         |  |  |      OPTION B         |       |
|  |                       |  |  |                       |       |
|  |   Lead worship with   |  |  |   Give the sermon     |       |
|  |   a terrible singing  |  |  |   with absolutely     |       |
|  |   voice               |  |  |   no preparation      |       |
|  |                       |  |  |                       |       |
|  +-----------------------+  |  +-----------------------+       |
|                             |                                  |
|             [ Animated Signpost Divider ]                      |
|                                                                |
+----------------------------------------------------------------+
```

**Phone Screen (Player)**
```text
+------------------+
|  Choose a Path   |
|                  |
| +--------------+ |
| |              | |
| |   OPTION A   | |
| |   (Blue)     | |
| |              | |
| +--------------+ |
|                  |
|       OR         |
|                  |
| +--------------+ |
| |              | |
| |   OPTION B   | |
| |   (Gold)     | |
| |              | |
| +--------------+ |
+------------------+
```

### B. Reveal Phase

**Host Screen (TV)**
```text
+----------------------------------------------------------------+
|  The Room is Divided...                                        |
|                                                                |
|  +----------------------------------------------------------+  |
|  | [BLUE BAR 45%]                 | [GOLD BAR 55%]          |  |
|  | 45%                            | 55%                     |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  +-----------------------+     +-----------------------+       |
|  |   Lead worship...     |     |   Give sermon...      |       |
|  |   (Minority Bonus!)   |     |   (Majority)          |       |
|  +-----------------------+     +-----------------------+       |
|                                                                |
|  Drafter Bonus: +500 (Near 50/50 Split!)                       |
|                                                                |
+----------------------------------------------------------------+
```

**Background Art**:
> "symbolic crossroads landscape, warm dusk sky, illuminated manuscript ornament, balanced scales motif, cream and gold UI panels, signpost center"

**State Variations & Transitions**
- **Voting**: Avatars pop in on the side they chose (hidden until reveal).
- **Reveal**: The split bar grows from the center outwards.
- **Perfect Split**: If 50/50, the center line glows bright white/gold.

---

## 7. Illustrated Scripture (Drawing)

**Design Brief**: An ancient scriptorium or artist's atelier. The focus is on the "Masterpiece" (the drawing). The frame should look like a heavy, ornate gold museum frame.

**Phase Flow**:
1. `Drawing` (90s) — Artists draw 2 frames
2. `Bluffing` (45s) — Non-artists write fake titles
3. `Voting` (30s) — Find the real title
4. `Reveal` (10s) — Truth shown

### A. Drawing Phase (Phone Only)

**Phone Screen (Artist)**
```text
+------------------+
|  Draw this:      |
|  "Moses dropping |
|   the tablets"   |
|                  |
|  [  CANVAS    ]  |
|  [ (Parchment ]  |
|  [  Texture)  ]  |
|                  |
| [Blk][Red][Blu]  |
| [Undo] [Clear]   |
|                  |
| Frame 1 of 2     |
+------------------+
```

### B. Voting Phase

**Host Screen (TV)**
```text
+----------------------------------------------------------------+
|  [Timer: 30s]                                                  |
|  What is this masterpiece?                                👥 6 |
|                                                                |
|  +----------------------------------------------------------+  |
|  |  [ ORNATE GOLD FRAME ]                                   |  |
|  |                                                          |  |
|  |  [ ANIMATED DRAWING PLAYING (Looping) ]                  |  |
|  |                                                          |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  +--------------------------+    +--------------------------+  |
|  | A. Moses breaking tablets|    | B. Ten Commandments      |  |
|  +--------------------------+    +--------------------------+  |
|  | C. Angry Stone Mason     |    | D. The First Tablet      |  |
|  +--------------------------+    +--------------------------+  |
|                                                                |
+----------------------------------------------------------------+
```

### C. Reveal Phase

**Host Screen (TV)**
```text
+----------------------------------------------------------------+
|  The True Title...                                             |
|                                                                |
|  +----------------------------------------------------------+  |
|  |  [ DRAWING STILL VISIBLE ]                               |  |
|  +----------------------------------------------------------+  |
|                                                                |
|  +--------------------------+    +--------------------------+  |
|  | A. Moses breaking tablets|    | B. Ten Commandments      |  |
|  |    [REAL TITLE]          |    |    [Written by Tom]      |  |
|  |    (Artist: Sarah)       |    |    (Fooled: Mike)        |  |
|  +--------------------------+    +--------------------------+  |
|                                                                |
|  Sarah gets +1000 pts for drawing!                             |
|  Tom gets +500 pts for fooling Mike!                           |
+----------------------------------------------------------------+
```

**Background Art**:
> "illuminated manuscript workshop, vellum sheets, pigment jars, warm candlelight, ornate gold frame, clean drawing surface, monastic studio"

**State Variations & Transitions**
- **Animation**: The drawing flickers between Frame 1 and Frame 2 (onion skin effect).
- **Bluff Entry**: "Waiting for other scribes..." with a quill writing animation.
- **Reveal**: The real title gets a "Wax Seal" of authenticity.

---

## 8. Who Am I? (Charades)

**Design Brief**: A bustling town marketplace. High energy, high visibility. The text on the TV must be MASSIVE because the guesser is facing away, but the audience needs to see it clearly from a distance.

**Phase Flow**:
1. `Deck Select` (20s) — Choose category
2. `Round Active` (60s) — Guesser guesses
3. `Summary` (10s) — Round results

### A. Round Active Phase

**Host Screen (TV)**
```text
+----------------------------------------------------------------+
|  [Timer Ring: 45s]                                             |
|  Category: Bible Heroes                                   👥 4 |
|                                                                |
|                                                                |
|                  SAMSON                                        |
|            [MASSIVE TEXT]                                      |
|                                                                |
|                                                                |
|  (Clue Givers: Describe this person!)                          |
|  (Guesser: Face AWAY from the TV!)                             |
|                                                                |
|  Current Score: 3                                              |
+----------------------------------------------------------------+
```

**Phone Screen (Guesser)**
```text
+------------------+
|  FACE AWAY!      |
|  Don't look at   |
|  the TV!         |
|                  |
|  Listen to your  |
|  friends!        |
|                  |
| +--------------+ |
| |              | |
| |   PASS       | |
| |   (Red)      | |
| |              | |
| +--------------+ |
|                  |
| +--------------+ |
| |              | |
| |   GOT IT!    | |
| |   (Green)    | |
| |              | |
| +--------------+ |
+------------------+
```

**Phone Screen (Clue Givers)**
```text
+------------------+
|  Clue Giver      |
|                  |
|  The Word Is:    |
|                  |
|  SAMSON          |
|                  |
|  Taboo Words:    |
|  - Hair          |
|  - Delilah       |
|  - Strong        |
|                  |
+------------------+
```

### B. Summary Phase

**Host Screen (TV)**
```text
+----------------------------------------------------------------+
|  Round Complete!                                               |
|                                                                |
|  Guesser: Mike                                                 |
|  Total Score: 7                                                |
|                                                                |
|  History:                                                      |
|  1. Samson (Correct) ✅                                        |
|  2. David (Correct) ✅                                         |
|  3. Goliath (Passed) ❌                                        |
|  4. Moses (Correct) ✅                                         |
|  ...                                                           |
|                                                                |
|  Next Guesser: Sarah                                           |
+----------------------------------------------------------------+
```

**Background Art**:
> "biblical marketplace setting, warm sandstone, parchment signage, gold filigree UI, high readability typography, bustling town square"

**State Variations & Transitions**
- **Correct**: Screen flashes Green, "Ding!" sound, new word slides in.
- **Pass**: Screen flashes Red, "Whoosh" sound, new word slides in.
- **Timer**: Ring turns red in last 10 seconds.
