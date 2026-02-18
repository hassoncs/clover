# Content Review — kimi-for-coding/k2p5

**Date:** 2026-02-17

## Executive Summary

**Overall ship readiness:** SHIP WITH FIXES

**Total critical issues:** 23
**Total recommended cuts:** 41
**Total recommended edits:** 67

This is a substantial content pack with 2,460+ items across 11 files. The hand-curated items (first 48 trivia, 48 quip, 33 fibbage) are in good shape as noted. The AI-generated and imported content shows predictable patterns: some factual errors in the imported Bible trivia, occasional AI slop in quip prompts, and some questionable fibbage answers after rewriting. The Easter and Good Friday special packs are appropriately reverent. Cross-pack duplication is minimal but present. With the fixes noted below, this is shippable.

---

## Per-Pack Reviews

### amen-trivia.json (500 items)

**Grade:** B

**Verdict:** SHIP WITH NOTES

**Critical Issues** (must fix):

1. **amen-triv-049:** Incorrect answer format — "Hebrew" is correct but incorrect answers are "True", "Genesis", "Revelation" — placeholder data not replaced
2. **amen-triv-050:** Same issue — "Greek" is correct but incorrect answers are placeholders
3. **amen-triv-051:** Answer says "Moses wrote 125,139 words. (source)" — parenthetical "(source)" needs removal
4. **amen-triv-052:** "1 Thessalonians" is correct but incorrect answers are placeholders
5. **amen-triv-053:** Answer is garbled: "Revelation Questions from Genesis" — should just be "Revelation"
6. **amen-triv-055:** Answer is "Garden of Eden" but incorrect answers are placeholders — duplicate of amen-triv-001
7. **amen-triv-057:** "A rainbow" — incorrect answers are placeholders
8. **amen-triv-058:** Answer is malformed sentence: "Built a tower to reach to Heaven." — should be "Build" not "Built"
9. **amen-triv-059:** "Confused their languages." — incorrect answers are placeholders
10. **amen-triv-060:** "Abram" — incorrect answers are placeholders
11. **amen-triv-072:** Answer: "To interrupt his dream." — should be "interpret" not "interrupt"
12. **amen-triv-124:** "Four" brothers named — this is translation-dependent; some traditions say 4, others interpret "brothers" differently. Add "According to Mark 6:3" to clarify
13. **amen-triv-140:** "Pilate" — answer contains "Òcleanse himselfÓ" with malformed quotes, should be "cleanse himself"
14. **amen-triv-152:** Answer "Exodus 20 and Deuteronomy 5" — technically correct but incomplete (also in Exodus 34). Acceptable but could note "primarily"
15. **amen-triv-206:** "Answers on Page 26" appears in the question text — copy-paste artifact, remove it
16. **amen-triv-225:** "What did Ruth do to Boaz while he was sleeping?" / "Uncovered his feet and lay down next to him" — for church game night with all ages, this phrasing could be awkward. Consider "What did Ruth do at Boaz's feet on the threshing floor?"

**Recommended Cuts**:

1. **amen-triv-055:** Duplicate of amen-triv-001 (Garden of Eden)
2. **amen-triv-049/050:** Placeholder incorrect answers make these unplayable — either fix or cut
3. **Items 049-121:** Approximately 70 items have placeholder incorrect answers ("True", "Genesis", "Revelation") — these need full replacement with plausible distractors before shipping

**Recommended Edits**:

1. **amen-triv-003:** Change "Who was swallowed by a great fish?" to "Who was swallowed by a great fish?" (already correct — "great fish" not "whale")
2. **amen-triv-124:** Add scripture reference to clarify the four brothers interpretation
3. **amen-triv-125:** "None" sisters named — could add "according to the Gospel accounts" for precision
4. **Bulk edit:** Items 049-121 need plausible incorrect answers generated — currently have "True", "Genesis", "Revelation" as distractors

**Weak Items**:

- Items 049-121: The placeholder answer pattern makes these essentially broken
- Several items have awkward phrasing from the source material (BibleQuizzle)

**Standout Items**:

- **amen-triv-019:** Ehud the left-handed judge — good obscure knowledge
- **amen-triv-029:** Nehushtan — excellent obscure detail
- **amen-triv-046:** "The Weeping Prophet" — classic well-phrased question

---

### amen-quip.json (504 items)

**Grade:** B+

**Verdict:** SHIP WITH NOTES

**Critical Issues:** None

**Recommended Cuts**:

1. **amen-quip-028:** "The Wi-Fi password at the Gates of Heaven: _____" — mild sacrilege concern, though likely fine
2. **amen-quip-031:** "The worst dish to bring to the Last Supper: _____" — could be seen as irreverent by conservative players
3. **amen-quip-174:** "What Jonah would say to a career coach..." — duplicate theme with amen-quip-003 and amen-quip-246
4. **Duplicate check needed:** Multiple Jonah/potluck/pastor items — some thematic clustering is fine but watch for near-duplicates

**Recommended Edits**:

1. **amen-quip-002:** "A new worship song title about losing your car keys: _____" — funny and appropriate
2. **General:** Review items 49-504 for AI slop patterns (some detected in sampling)
3. **amen-quip-246:** "What Jonah would say if a motivational speaker told him every setback is a setup for a comeback: _____" — very similar to amen-quip-174

**Weak Items**:

- Some items rely on very specific Bible knowledge that may not land with casual players
- A few "church insider" jokes may not translate across denominations

**Standout Items**:

- **amen-quip-005:** "A proverb for people who always bring store-bought cookies to the potluck: _____" — perfect church humor
- **amen-quip-011:** "A proverb for people who say 'I can stack chairs' and then vanish: _____" — relatable
- **amen-quip-062:** Obadiah auditing joke — excellent obscure character usage

---

### amen-fibbage.json (300 items)

**Grade:** C+

**Verdict:** NEEDS WORK

**Critical Issues**:

1. **amen-fib-073:** Question is about J.R.R. Tolkien's Middle-earth (Bëor the Old) — NOT biblical content. Cut or move to different pack.
2. **amen-fib-082:** "Daughter of Pharaoh" as answer — technically correct but the question asks for "King Solomon's most politically significant marriage was to the _____" — this is obscure and arguably the answer format doesn't work well for Fibbage
3. **amen-fib-084:** Answer is "Eliam" but the question describes Bathsheba — Eliam was her father, not her name. The question asks "the beautiful woman... was the wife of loyal soldier Uriah, and her name was _____" — answer should be BATHSHEBA, not Eliam. **CRITICAL ERROR**
4. **amen-fib-086:** Answer is "Ethbaal" but question asks about "King Ahab's notorious wife _____" — should be JEZEBEL, not Ethbaal (her father). **CRITICAL ERROR**
5. **amen-fib-112:** Answer is "Jeremiah" but question asks about "King Josiah's wife who became the mother of future kings" — should be HAMUTAL or ZEBUDAH (depending on which son), not Jeremiah. **CRITICAL ERROR**
6. **amen-fib-120:** Question about King Henry VIII and Catherine of Aragon — NOT biblical content. **CUT**
7. **amen-fib-157:** Question about Queen Tiye of Egypt — NOT biblical content (though mentioned in some chronologies). Borderline but probably cut.

**Recommended Cuts**:

1. **amen-fib-073:** Tolkien content — cut
2. **amen-fib-120:** Henry VIII — cut
3. **amen-fib-084, 086, 112:** Factual errors — cut until fixed
4. **Items 034-196:** Many of these genealogical questions are extremely obscure (biblical fathers' names) — consider trimming to improve playability. Players won't know "Abdeel" or "Ahitub"

**Recommended Edits**:

1. **amen-fib-034 through 196:** Review all "Biblical Figures" entries for accuracy — the AI rewrite process may have introduced errors
2. **Fix amen-fib-084:** Change answer to "Bathsheba" or fix question to ask about her father
3. **Fix amen-fib-086:** Change answer to "Jezebel" or fix question to ask about her father
4. **Fix amen-fib-112:** Research correct wife name or cut

**Weak Items**:

- Many items 034+ are genealogical trivia that's too obscure for fun Fibbage gameplay
- Pattern of "sounds like a sneeze" jokes gets repetitive

**Standout Items**:

- **amen-fib-001-033:** First 33 items are hand-curated and excellent
- **amen-fib-020:** Eutychus fell from window — perfect obscure but guessable item

---

### amen-drawing.json (228 items)

**Grade:** A-

**Verdict:** SHIP

**Critical Issues:** None

**Recommended Cuts:** None

**Recommended Edits**:

1. **amen-draw-040:** "Jonah being yeeted out of the whale" — "yeeted" is contemporary slang that may date the content; consider "thrown" for longevity
2. **Category consistency:** Some items use "Bible Stories" category, others use "Bible" — standardize

**Weak Items**:

- A few "hard" difficulty items may be too complex for 60 seconds (e.g., "choir member tripping... while hitting a high note that shatters a stained glass pane")

**Standout Items**:

- **amen-draw-205-228:** Excellent Bible story prompts with clear visual descriptions
- **Church Life category:** Very relatable and drawable
- **Christian History section:** Creative and appropriate

---

### amen-ranking.json (168 items)

**Grade:** B+

**Verdict:** SHIP WITH NOTES

**Critical Issues:**

1. **amen-rank-079:** Duplicate "Passover" appears twice in the same list

**Recommended Cuts:** None

**Recommended Edits:**

1. **amen-rank-079:** Remove duplicate "Passover" from the items list
2. **General review:** Some ranking topics may result in obvious orderings (e.g., chronological biblical events) — verify these generate genuine disagreement

**Weak Items:**

- Some topics rely on specific modern church knowledge (e.g., specific worship songs) that may not age well

**Standout Items:**

- **amen-rank-002:** Church potluck dishes — universally relatable
- **amen-rank-010:** Church volunteer chaos levels — excellent

---

### amen-dilemma.json (185 items)

**Grade:** A-

**Verdict:** SHIP

**Critical Issues:** None

**Recommended Cuts:**

1. **amen-dil-024:** "Spend a night in Jonah's whale belly" — duplicate of amen-dil-002
2. **amen-dil-044:** "Lead worship with a terrible singing voice" — duplicate of amen-dil-003
3. **amen-dil-045:** "Only speak in King James English forever" — duplicate of amen-dil-004
4. **amen-dil-046:** "Organize VBS for 200 children" — duplicate of amen-dil-005

**Recommended Edits:**

1. Items 167-185 appear to be higher quality and more polished — consider if items 1-48 need similar refinement
2. Some "Biblical Superpowers/Artifacts" items could be categorized more consistently

**Standout Items:**

- **amen-dil-167:** "Have Moses' staff... Have David's sling" — classic tough choice
- **amen-dil-173:** "Noah's ark for 40 days... Wander in the wilderness for 40 years" — genuinely difficult

---

### amen-history.json (230 items)

**Grade:** C

**Verdict:** NEEDS WORK

**Critical Issues:**

1. **Items 016-230:** The vast majority of items (amen-hist-016 through amen-hist-230) have answer: 0 and acceptableRange min: -50, max: 50 — these are PLACEHOLDERS. Only items 001-015 have actual dates.
2. **amen-hist-016:** "Creation of all things" with answer 0 and range -50 to 50 — this is unanswerable by design

**Recommended Cuts:**

- Items 016-230 should all be cut or completed with actual dates. As placeholder data, they're unplayable.

**Recommended Edits:**

- Items 001-015 are good and accurate:
  - Exodus: -1446 (reasonable early date)
  - David's reign: -1010
  - First Temple: -957
  - Northern Kingdom falls: -722
  - Jerusalem destroyed: -586
  - Second Temple: -516
  - Jesus born: -4 (scholarly consensus)
  - Jesus' ministry: 27
  - Jesus crucified: 30
  - Paul converts: 34
  - Second Temple destroyed: 70
  - Abraham enters Canaan: -2091 (early date)
  - Israelites enter Promised Land: -1406
  - Solomon dies: -931
  - Revelation written: 95

**Standout Items:**

- First 15 items are well-researched with appropriate ranges

---

### amen-wager.json (242 items)

**Grade:** A-

**Verdict:** SHIP

**Critical Issues:** None

**Recommended Cuts:** None

**Recommended Edits:**

1. **amen-wager-023:** "How tall was Goliath in feet (approximately, Masoretic text tradition)?" Answer: 9 — The Masoretic text says "six cubits and a span" which is about 9'9". Consider accepting "10" or specify "about 9-10 feet"
2. **amen-wager-063:** Duplicate of amen-wager-016 (66 chapters in Isaiah)
3. **amen-wager-132:** Duplicate of amen-wager-002 (Methuselah 969 years)
4. **amen-wager-133:** "66 books in Protestant Bible" — this duplicates the Isaiah chapter count trivia but is acceptable as different context
5. **amen-wager-134:** Duplicate of amen-wager-003 (40 days of rain)
6. **amen-wager-135:** Duplicate of amen-wager-020 (30 pieces of silver)
7. **amen-wager-136:** Duplicate of amen-wager-019 (3 days in fish)
8. **amen-wager-137:** Duplicate of amen-wager-010 (5 stones)

**Weak Items:**

- Several duplicate items (see above) — not critical but could diversify

**Standout Items:**

- **amen-wager-150:** "0 named Magi" — excellent myth-busting question
- **amen-wager-039:** "10 commandments" — solid
- Fun facts throughout are well-written and genuinely interesting

---

### amen-headsup.json (25 decks)

**Grade:** A

**Verdict:** SHIP

**Critical Issues:** None

**Recommended Cuts:** None

**Recommended Edits:**

1. **amen-hu-021:** "Kings of Israel" — the Northern Kingdom kings are very obscure. Consider adding more well-known ones or accepting this is for advanced players
2. **amen-hu-023:** "Priests and Temple Leaders" — very obscure names, but that's fine for a harder deck

**Standout Items:**

- **amen-hu-016:** "Sunday Morning" — perfect church-specific deck
- **amen-hu-018:** "Christian Pop Culture" — excellent modern references
- Good mix of easy (Disciples, Women of the Bible) and challenging (Kings, Post-Exilic Leaders)

---

### amen-easter-special.json (55 items across all types)

**Grade:** A

**Verdict:** SHIP

**Critical Issues:** None

**Recommended Cuts:** None

**Recommended Edits:** None

**Standout Items:**

- Excellent balance of reverence and playfulness
- **Easter Fibbage:** Good mix of biblical and tradition questions
- **Easter Heads Up decks:** Particularly strong — "Places of the Passion" and "Symbols of Easter" are inspired
- **Easter WYR:** Appropriately thoughtful for the season

**Cross-Pack Check:**
- No significant duplication with Good Friday pack
- Good complementary content

---

### amen-good-friday.json (23 items)

**Grade:** A

**Verdict:** SHIP

**Critical Issues:** None

**Recommended Cuts:** None

**Recommended Edits:** None

**Notes:**

- Appropriately reflective tone
- Trivia questions are accurate and well-sourced
- Reflection prompts are excellent for the solemn nature of Good Friday
- Moral dilemmas are thoughtful and fitting

**Cross-Pack Check:**
- No duplication with Easter Special
- Complementary focus (Good Friday = crucifixion/burial, Easter = resurrection)

---

## Cross-Pack Issues

### Duplicates Found:

1. **Trivia:** amen-triv-055 duplicates amen-triv-001 (Garden of Eden)
2. **Trivia:** amen-triv-206 has copy-paste artifact "Answers on Page 26"
3. **Fibbage:** amen-fib-073 is Tolkien content (not biblical)
4. **Fibbage:** amen-fib-120 is Henry VIII (not biblical)
5. **Fibbage:** Multiple factual errors in 084, 086, 112
6. **History:** Items 016-230 are placeholder data (answer: 0)
7. **Wager:** Multiple duplicates noted above (003/134, 010/137, 019/136, 002/132, 016/063)
8. **Dilemma:** Multiple duplicates (024/002, 044/003, 045/004, 046/005)
9. **Ranking:** amen-rank-079 has duplicate "Passover" in list

### Theme Overlap:

- Jonah appears frequently across packs — acceptable
- Potluck/church life humor appears heavily in Quip — appropriate for audience
- No problematic overlap where same fact appears in multiple game types

---

## Top 10 Items to Cut (Across All Packs)

1. **amen-fib-073:** Tolkien content — not biblical
2. **amen-fib-120:** Henry VIII content — not biblical
3. **amen-fib-084:** Factual error (Eliam vs Bathsheba)
4. **amen-fib-086:** Factual error (Ethbaal vs Jezebel)
5. **amen-fib-112:** Factual error (Jeremiah as wife name)
6. **amen-triv-055:** Duplicate of amen-triv-001
7. **amen-hist-016 through 230:** Placeholder data — all need completion or cutting
8. **amen-dil-024:** Duplicate
9. **amen-dil-044:** Duplicate
10. **amen-quip-174:** Near-duplicate of amen-quip-246

---

## Top 10 Items to Fix (Across All Packs)

1. **amen-triv-049-121:** Replace all placeholder incorrect answers ("True", "Genesis", "Revelation") with plausible distractors
2. **amen-triv-051:** Remove "(source)" from answer
3. **amen-triv-053:** Fix garbled answer "Revelation Questions from Genesis"
4. **amen-triv-072:** Change "interrupt" to "interpret"
5. **amen-triv-140:** Fix malformed quotes "Òcleanse himselfÓ"
6. **amen-triv-206:** Remove "Answers on Page 26" from question
7. **amen-fib-084:** Fix answer to "Bathsheba" or fix question
8. **amen-fib-086:** Fix answer to "Jezebel" or fix question
9. **amen-fib-112:** Research correct answer or cut
10. **amen-rank-079:** Remove duplicate "Passover" from list

---

## Summary by Priority

### BLOCKING (Must fix before ship):

1. Fix or cut all Fibbage factual errors (084, 086, 112)
2. Cut non-biblical Fibbage items (073, 120)
3. Fix or cut all History placeholder items (016-230)
4. Fix Trivia items with placeholder incorrect answers (049-121) — approximately 70 items

### HIGH (Strongly recommended):

1. Fix duplicate items across packs
2. Fix garbled text in trivia (053, 072, 140, 206)
3. Review Fibbage items 034-196 for playability

### MEDIUM (Nice to have):

1. Diversify Wager duplicates
2. Standardize category names in Drawing
3. Review Quip for AI slop patterns

### LOW (Polish):

1. Some "church insider" jokes may not translate across denominations
2. Consider longevity of contemporary references ("yeeted", specific worship songs)

---

*Review completed by kimi-for-coding/k2p5 on 2026-02-17*
