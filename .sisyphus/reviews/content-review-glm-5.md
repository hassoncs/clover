# Content Review — glm-5

Date: 2026-02-17

---

## amen-trivia.json (500 items)

**Grade**: F

**Verdict**: ❌ **DO NOT SHIP** — Critical blocker

### Critical Issues (must fix):

**🚨 BLOCKER: 452 items have broken incorrectAnswers arrays (items 49-500)**

From `amen-triv-049` through `amen-triv-500`, every single item has placeholder values instead of plausible wrong answers:
```json
"incorrectAnswers": ["True", "Genesis", "Revelation"]
```

This completely breaks the game mechanic — players will immediately identify the correct answer because these three options are nonsensical for nearly every question.

**Examples of broken items:**
- amen-triv-049: "In what language was most of the Old Testament given?" → Options: "Hebrew", "True", "Genesis", "Revelation"
- amen-triv-100: "Who mocked God and challenged them?" → Options: "Goliath the giant", "True", "Genesis", "Revelation"
- amen-triv-500: "What were the restrictions on marriage for the daughters of Zelophehad?" → Options: "They must marry within their tribe", "True", "Genesis", "Revelation"

**Fix Required**: Generate plausible distractors for all 452 broken items. Each item needs 3 wrong answers that:
1. Are definitively incorrect
2. Sound plausible enough to be tempting
3. Are in the same format/type as the correct answer

### Factual Accuracy Issues (items 1-48):

- **amen-triv-003**: ✅ Correctly says "great fish" not "whale" — good
- **amen-triv-026**: Answer "3" is correct for days in tomb
- **amen-triv-053**: correctAnswer has corruption: "Revelation Questions from Genesis" — appears to be data error. Should be "Revelation"
- **amen-triv-051**: Answer includes artifact: "Moses wrote 125,139 words. (source)" — should clean to "Moses"

### Hand-curated Items (1-48) Assessment:

Items 1-48 have proper distractors and passed review:
- Correct answers are factually accurate
- Distractors are plausible but definitively wrong
- Good difficulty mix (easy Sunday School facts to moderate Bible knowledge)
- Good category spread

### Recommended Cuts:

- None from items 1-48 (the only usable content)

### Standout Items (from 1-48):

- **amen-triv-019**: Ehud the left-handed judge — obscure but verifiable, great for challenging players
- **amen-triv-029**: Nehushtan (bronze snake) — excellent deep cut
- **amen-triv-040**: Malchus (servant's ear) — specific detail that rewards close Bible readers

### Summary:

**Can ship items 1-48 as-is.** Items 49-500 are completely broken and must be regenerated with proper distractors before shipping. This is a data pipeline failure, not a content issue.

---

## amen-fibbage.json (300 items)

**Grade**: C-

**Verdict**: ⚠️ **NEEDS WORK** — Factual errors and non-biblical content must be fixed

### Critical Issues (must fix):

**amen-fib-044**: ❌ Answer "Ahimaaz" is WRONG. Ahimaaz was a MAN (priest's messenger), not a woman. King Saul's wife was Ahinoam.
→ FIX: Change answer to "Ahinoam"

**amen-fib-061**: ❌ Answer "Aretas" is WRONG. Aretas was the KING of Arabia, not a princess. The question is fundamentally broken.
→ FIX: Either change to ask about Aretas the king, or change answer to "Herodias" and reframe.

**amen-fib-084**: ❌ Answer "Eliam" is WRONG. Eliam was Bathsheba's FATHER, not the woman who caught David's eye.
→ FIX: Answer should be "Bathsheba" or reframe question.

**amen-fib-086**: ❌ Answer "Ethbaal" is WRONG. Ethbaal was Jezebel's FATHER (King of Sidon). The answer should be "Jezebel".
→ FIX: Change answer to "Jezebel"

**amen-fib-112**: ❌ Answer "Jeremiah" is WRONG. Jeremiah was a male PROPHET, not a queen. Josiah's wife was Zebidah.
→ FIX: Change answer to "Zebidah"

**amen-fib-116**: ❌ Answer "Jesse" is WRONG. Jacob (who wrestled with the angel) was originally named Jacob, not Jesse! Jesse was David's father.
→ FIX: Reframe question or fix answer to "Jacob"

### Non-Biblical Content (cut):

- **amen-fib-073**: References Tolkien's Middle-earth — NOT BIBLICAL
- **amen-fib-120**: References King Henry VIII — Medieval English history, NOT BIBLICAL
- **amen-fib-256**: Shakespeare's "The Tempest" reference — NOT BIBLICAL
- **amen-fib-234**: Iowa town and appliances — NOT BIBLICAL
- **amen-fib-261**: Hungarian history, Magyar chieftain — NOT BIBLICAL
- **amen-fib-206**: "R.V." recreational vehicle reference — nonsensical
- **amen-fib-133**: Sons named Uno, Dos, Tres, Cuatro — made-up nonsense
- **amen-fib-152**: "Phalluites" fertility cult reference — inappropriate content

### Category Errors:

- **amen-fib-199**: Abel is a PERSON, not a place. Wrong category "Biblical Geography"
→ FIX: Change to "Biblical Figures" or "Old Testament"

### Quality Issues (items 34+):

The hand-curated items 1-33 are excellent. Items 34+ (AI-generated) suffer from:
- Excessive verbosity (3-4 sentences for simple questions)
- Repetitive "sounds like a sneeze" jokes (15+ times)
- Pop culture references (Harry Potter, Pokémon) that will age poorly
- Inconsistent difficulty (some trivial, some impossibly obscure)

### Standout Items:

- **amen-fib-001**: Zipporah — solid, referenced
- **amen-fib-013**: Shamgar's oxgoad — unusual, specific
- **amen-fib-020**: Eutychus falling from window — funny, memorable
- **amen-fib-030**: Uzzah touching the Ark — good difficulty
- **amen-fib-225**: Akeldama (field of blood) — perfect for Fibbage

### Summary:

Items 1-33 (hand-curated) are good to ship. Items 34+ need:
1. Fix 7 factual errors
2. Remove 8+ non-biblical items
3. Clean up verbose wording

---

## amen-wager.json (128 items — note: file has 128, not 242 as stated)

**Grade**: A

**Verdict**: ✅ **SHIP** — Excellent quality

### Assessment:

This pack is in excellent shape:
- All answers are verifiable from scripture ✓
- Scripture references provided for every item ✓
- Fun facts add flavor without being irreverent ✓
- Good variety of categories (ages, books, numbers, history) ✓
- Questions are clear and concise ✓

### Denomination Consideration:

- **amen-wager-091**: "How many books in Catholic Bible (73)" — This is denomination-specific. Protestant players may be confused. Consider: labeling clearly as "Catholic Bible" or removing for ecumenical audiences.

### Game Mechanic Notes:

- **amen-wager-128**: 144,000 is a very large number — might feel unfair for wagering (hard to get close). Consider if this creates frustration.
- **amen-wager-110**: 666 talents — the number has negative associations but is biblically accurate (1 Kings 10:14). Keep, but be aware some may find it distracting.

### Standout Items:

- **amen-wager-118**: Nehemiah's wall in 52 days — surprising number, great for wagering
- **amen-wager-051**: Caleb at 85 — inspiring senior citizen content
- **amen-wager-022**: 153 fish — oddly specific, memorable
- **amen-wager-044**: Josiah reigned 31 years — the funFact is hilarious

### Cross-Pack Duplicate Note:

These numbers also appear in trivia — not a problem, just noting:
- Methuselah: 969 years (trivia + wager)
- Noah: 600 years old at flood (trivia + wager)
- 40 days flood rain (trivia + wager)

### Summary:

Ready to ship. Optional: remove/label amen-wager-091 for Protestant audiences.

---

## amen-quip.json (504 items)

**Grade**: A

**Verdict**: ✅ **SHIP** — Excellent quality

### Assessment:

High-quality creative content that will generate laughs at church game nights:
- Church-insider humor that's warm, never sacrilegious ✓
- Good variety of categories (Bible Character + Modern, Proverbs for People Who _____, etc.) ✓
- Blanks are open enough for creative answers ✓
- Bible character references are accurate and clever ✓
- No AI slop detected ✓

### Near-Duplicates (minor - not blocking):

- **amen-quip-004** + **amen-quip-409**: Both reference "Just As I Am" seventh verse
- **amen-quip-012** + **amen-quip-414**: Both about Noah + weather scenarios
- **amen-quip-156** + **amen-quip-500**: Both about Jonah + vacation/tourism

These are different enough to keep - just noting for awareness.

### Standout Items:

- **amen-quip-011**: Proverb for chair-stack-vanishers — peak church relatability
- **amen-quip-097**: Child's unintentional sermon illustration — gold
- **amen-quip-137**: Bulletin typo that changed the tone — everyone has a story
- **amen-quip-471**: Googling pastor's illustrations — very 2024

### Summary:

Ready to ship as-is. This is the strongest AI-generated pack in the review.

---

## amen-drawing.json (228 items)

**Grade**: A

**Verdict**: ✅ **SHIP**

All prompts are drawable in 60 seconds with one clear visual subject. Good difficulty mix. Categories well-balanced (Bible, Church Life, Music, Food, Pop Culture). No AI slop.

---

## amen-ranking.json (168 items)

**Grade**: A

**Verdict**: ✅ **SHIP**

Every ranking item has genuinely debatable options with no obvious ordering. Great mix of Bible characters, church life, and modern faith scenarios. No lopsided choices.

---

## amen-dilemma.json (185 items)

**Grade**: A

**Verdict**: ✅ **SHIP**

Both options genuinely tough in every dilemma. No lopsided choices. Great variety across Biblical Superpowers, Situations, Church Volunteer Chaos, and Modern Faith-Life categories.

---

# Executive Summary

## Overall Ship Readiness: ⚠️ **SHIP WITH CRITICAL FIX**

| Pack | Status | Action Required |
|------|--------|------------------|
| **trivia** (500) | ❌ BLOCKED | Regenerate distractors for items 49-500 |
| **fibbage** (300) | ⚠️ NEEDS FIXES | Fix 7 factual errors, cut 8 non-biblical items |
| **wager** (128) | ✅ SHIP | Optional: label amen-wager-091 for Protestants |
| **quip** (504) | ✅ SHIP | None |
| **drawing** (228) | ✅ SHIP | None |
| **ranking** (168) | ✅ SHIP | None |
| **dilemma** (185) | ✅ SHIP | None |

## Critical Actions (Blocking):

1. **amen-trivia.json**: 452 items (49-500) have placeholder `incorrectAnswers: ["True", "Genesis", "Revelation"]` — MUST regenerate with plausible distractors
2. **amen-fibbage.json**: 7 factual errors + 8 non-biblical items must be fixed/removed

## Total Issues:

| Severity | Count |
|----------|-------|
| Critical (blocking) | 459 |
| Recommended cuts | 8+ |
| Recommended edits | 7 |

## Top 10 Items to Fix:

1. **amen-triv-049 through amen-triv-500**: All need distractor regeneration
2. **amen-fib-084**: Answer "Eliam" wrong → Bathsheba's father, not Bathsheba
3. **amen-fib-086**: Answer "Ethbaal" wrong → Jezebel's father, not Jezebel
4. **amen-fib-112**: Answer "Jeremiah" wrong → Jeremiah was male prophet, not queen
5. **amen-fib-116**: Answer "Jesse" wrong → Jacob wrestled angel, not Jesse
6. **amen-fib-073**: Tolkien reference — cut
7. **amen-fib-120**: Henry VIII reference — cut

## Ready to Ship (1,413 items):

- Wager: 128 items
- Quip: 504 items
- Drawing: 228 items
- Ranking: 168 items
- Dilemma: 185 items
- Trivia items 1-48: 48 items
- Fibbage items 1-33: 33 items
- Fibbage usable items 34+: ~220 items (after fixes)

**~78% of content is ready to ship immediately.** The trivia distractor issue is a data pipeline failure, not a content quality issue.
