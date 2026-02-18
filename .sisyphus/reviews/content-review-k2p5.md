# Content Review — amen.games (k2p5)

**Date:** 2026-02-17  
**Model:** k2p5  
**Total Files Reviewed:** 11 packs  
**Total Items Reviewed:** 2,316+ items

---

## Executive Summary

**Overall Ship Readiness:** **🔴 NEEDS WORK — DO NOT SHIP**

This content review reveals **critical data corruption issues** affecting the majority of the trivia pack, along with numerous quality issues across other packs. The content is not ready for production without significant fixes.

| Metric | Count |
|--------|-------|
| **Total Critical Issues** | 450+ |
| **Total Recommended Cuts** | 85+ |
| **Total Recommended Edits** | 120+ |
| **Packs Ready to Ship** | 3 (Heads Up, Good Friday, Easter Special) |
| **Packs Needing Major Work** | 4 (Trivia, History, Fibbage, Wager) |

**Packs that MUST be fixed before shipping:**
1. **amen-trivia.json** — 90% of items have placeholder incorrect answers
2. **amen-history.json** — ~215 items have placeholder answer values
3. **amen-wager.json** — 30+ duplicate questions

**Packs ready to ship as-is:**
1. **amen-headsup.json** — Clean, well-organized, appropriate difficulty
2. **amen-good-friday.json** — Hand-curated, appropriate tone
3. **amen-easter-special.json** — Clean, good quality

---

## Per-Pack Reviews

### 1. amen-trivia.json (500 items)

**Grade:** F  
**Verdict:** 🔴 **NEEDS WORK — CRITICAL ISSUES**

**CRITICAL ISSUES (MUST FIX BEFORE SHIP):**

The most severe issue: **~452 items (items 049-500) have placeholder incorrect answers** instead of real plausible wrong answers. Every item from 049 onwards has:
```json
"incorrectAnswers": ["True", "Genesis", "Revelation"]
```

This is completely broken — players will immediately see these are wrong and the game becomes trivial. This appears to be a data import/processing error where real incorrect answers were never populated.

**Complete list of affected items:**
- amen-triv-049 through amen-triv-500 (452 items total)
- Every single item in this range needs replacement incorrect answers

**Specific items with additional issues:**

| Item ID | Issue | Suggested Fix |
|---------|-------|---------------|
| amen-triv-049 | Incorrect answers are "True", "Genesis", "Revelation" | Replace with actual wrong answers: "Aramaic", "Greek", "Latin" |
| amen-triv-050 | Incorrect answers are "True", "Genesis", "Revelation" | Replace with actual wrong answers: "Hebrew", "Aramaic", "Latin" |
| amen-triv-051 | Answer includes "(source)" citation text | Remove "(source)" — answer should just be "Moses" |
| amen-triv-053 | Answer says "Revelation Questions from Genesis" | Should be just "Revelation" |
| amen-triv-072 | "To interrupt his dream" — should be "interpret" | Fix typo: "interrupt" → "interpret" |
| amen-triv-097 | Question has typo: "What happened the idol" | Add "to": "What happened to the idol" |
| amen-triv-108 | Category should be "Biblical Figures" not "Biblical Geography" | Fix category |
| amen-triv-130 | Answer includes citation text "see Luke 8:1-3" | Remove citation, keep just the answer |
| amen-triv-136 | These are the only proper incorrect answers in the 049+ range — but the wrong answers (9, 11, 12) don't match the pattern | Verify these are correct |
| amen-triv-140 | Answer has special character: "Òcleanse himselfÓ" | Replace with standard quotes: "cleanse himself" |
| amen-triv-144 | Answer says "1 Cor 15:38" — should be "1 Cor 15:6" | Fix scripture reference |
| amen-triv-206 | Question has text: "Answers on Page 26" — leftover from source | Remove "Answers on Page 26" |
| amen-triv-318 | Question asks "In which book" but incorrect answers are "True", "Genesis", "Revelation" — one wrong answer IS the correct answer | This is a data corruption issue |

**RECOMMENDED CUTS:**

These items should be removed entirely:

| Item ID | Reason |
|---------|--------|
| amen-triv-051 | Answer format is wrong (includes "(source)") — just cut it |
| amen-triv-053 | Answer is garbled "Revelation Questions from Genesis" |
| amen-triv-144 | Wrong scripture reference, potentially confusing |

**WEAK ITEMS (consider cutting if trimming needed):**

Items with overly long answers or poor structure:

| Item ID | Issue |
|---------|-------|
| amen-triv-062 | Answer is very long: "That Abram would have more descendants than the number of stars." — too wordy for trivia |
| amen-triv-130 | Answer includes citation: "Several women who he had healed see Luke 8:1-3" — awkward format |
| amen-triv-158 | Answer includes citation in parentheses: "Rib (Gen 2:21)" — inconsistent format |
| amen-triv-159 | Answer format inconsistent: "(Simon) Peter (Matt 26:69-74)" — should just be "Peter" |
| amen-triv-160 | Answer format: "Serpent (Gen 3:1-6)" — inconsistent |
| amen-triv-174 | Answer is very long: "Threw him in a pit and then sold him to strangers (Gen 37:24-27)" |

**NEAR-DUPLICATES:**

| Item ID ≈ Item ID | What's Similar |
|-------------------|----------------|
| amen-triv-001 ≈ amen-triv-055 | Both ask about Garden of Eden (001 asks for name, 055 asks where they lived) |
| amen-triv-003 ≈ amen-triv-210 | Both about Jonah (003 asks who was swallowed, 210 asks who tried to flee) |
| amen-triv-005 ≈ amen-triv-208 | Both about Judas betraying Jesus |
| amen-triv-007 ≈ amen-triv-214 | Both reference Psalm 23 "green pastures" line |
| amen-triv-010 ≈ amen-triv-090 | Both about walls of Jericho falling |
| amen-triv-011 ≈ amen-triv-119 | Both about Daniel in lions' den |
| amen-triv-014 ≈ amen-triv-340 | Both ask which tax collector climbed a tree (Zacchaeus) |
| amen-triv-020 ≈ amen-triv-131 | Both ask about demon named Legion |
| amen-triv-023 ≈ amen-triv-092 | Both about Deborah as female judge |
| amen-triv-026 ≈ amen-triv-143 | Both about Jesus rising on third day/Sunday |
| amen-triv-030 ≈ amen-triv-145 | Both about Stephen as first martyr |
| amen-triv-032 ≈ amen-triv-068 | Both about Joseph's coat of many colors |
| amen-triv-035 ≈ amen-triv-270 | Both about John the Baptist's parents |
| amen-triv-039 ≈ amen-triv-141 | Both about Peter cutting off ear |
| amen-triv-042 ≈ amen-triv-224 | Both ask which tribe Paul was from |

**STANDOUT ITEMS (best in pack):**

These items are well-crafted and engaging:

| Item ID | Why It's Great |
|---------|----------------|
| amen-triv-019 | "Which judge was left-handed and killed a fat king?" — Specific, memorable detail |
| amen-triv-028 | "Who fell out of a window while Paul was preaching?" — Unexpected and funny |
| amen-triv-029 | "What was the name of the bronze snake Moses made?" (Nehushtan) — Good obscure knowledge |
| amen-triv-040 | "What was the name of the servant whose ear was cut off?" (Malchus) — Great detail |
| amen-triv-048 | "What was the name of the place where Jacob wrestled with God?" (Peniel) — Good geography |

**THEME/TOPIC DISTRIBUTION:**

- **Overrepresented:** Genesis stories (Joseph, Noah, Abraham appear repeatedly)
- **Underrepresented:** Minor prophets, wisdom literature (Job, Ecclesiastes), Revelation content beyond basic facts
- **Gaps:** Almost no questions about the construction of the tabernacle/temple details, the divided kingdom period, post-exilic prophets

**REPAIR PLAN FOR TRIVIA:**

1. **Immediate:** Remove or disable items 049-500 until incorrect answers can be regenerated
2. **Short-term:** Manually curate ~100 new incorrect answers for the most important questions
3. **Long-term:** Use AI to generate contextually appropriate wrong answers for all 452 affected items

---

### 2. amen-fibbage.json (300 items)

**Grade:** C+  
**Verdict:** 🟡 **SHIP WITH NOTES**

**OVERALL ASSESSMENT:**

The fibbage pack is structurally sound but has significant repetition and some answers that may be too well-known for the fibbage mechanic to work.

**CRITICAL ISSUES:**

| Item ID | Issue | Suggested Fix |
|---------|-------|---------------|
| amen-fib-072 | Answer: "To interrupt his dream" — should be "interpret" | Fix typo |

**RECOMMENDED CUTS:**

These items have answers that are too commonly known for Fibbage (players will know the answer, breaking the game):

| Item ID | Reason |
|---------|--------|
| amen-fib-001 | "Who led the Israelites out of Egypt?" (Moses) — Too well known |
| amen-fib-002 | "Who was swallowed by a great fish?" (Jonah) — Too well known |
| amen-fib-003 | "Who betrayed Jesus?" (Judas) — Too well known |
| amen-fib-006 | "What city's walls fell after Israelites marched around them?" (Jericho) — Too well known |
| amen-fib-018 | "Who was the only female judge?" (Deborah) — Too well known |

**WEAK ITEMS:**

Items with vague questions or answers:

| Item ID | Issue |
|---------|-------|
| Items 34-196 | Heavy focus on biblical genealogy — many players won't know these even as wrong answers |
| Multiple items | Many "Who was the father of X?" questions — may be too obscure for general audience |

**NEAR-DUPLICATES:**

| Item ID ≈ Item ID | What's Similar |
|-------------------|----------------|
| Multiple items | Heavy repetition of father/son relationships in biblical genealogy section |

**STANDOUT ITEMS:**

| Item ID | Why It's Good |
|---------|---------------|
| amen-fib-019 | "Who was the left-handed judge who killed a fat king?" (Ehud) — Obscure enough for Fibbage |
| amen-fib-029 | "What was the bronze snake Moses made called?" (Nehushtan) — Good obscure knowledge |
| amen-fib-040 | "What was the servant's name whose ear was cut off?" (Malchus) — Specific detail |

---

### 3. amen-wager.json (242 items)

**Grade:** D+  
**Verdict:** 🟡 **SHIP WITH MAJOR EDITS**

**CRITICAL ISSUES:**

**Significant Duplicate Problem:** ~30 questions appear multiple times with slight wording variations:

| Duplicate Group | Items Affected |
|-----------------|----------------|
| "How many days did it rain during Noah's flood?" | amen-wager-001, amen-wager-056, amen-wager-165, amen-wager-200 |
| "How many people on Noah's ark?" | amen-wager-002, amen-wager-057, amen-wager-166 |
| "How old was Abraham when Isaac born?" | amen-wager-004, amen-wager-059 |
| "How many disciples did Jesus have?" | amen-wager-005, amen-wager-060 |
| "How many days/nights in creation?" | amen-wager-054, amen-wager-199 |

**Factual Errors:**

| Item ID | Issue | Suggested Fix |
|---------|-------|---------------|
| amen-wager-206 | Question asks "how many years" but answer is "52 days" | Fix unit to "days" or question to match |
| amen-wager-210 | Scripture ref "Prov 31:33" — Proverbs 31 only has 31 verses | Remove or correct reference |
| amen-wager-236 | Unit says "chapters" but answer (176) refers to verses in Psalm 119 | Change unit to "verses" |

**WEAK ITEMS:**

| Item ID | Issue |
|---------|-------|
| Items 210-242 | Fun facts are shorter and less polished than earlier items — inconsistent quality |

**STANDOUT ITEMS:**

| Item ID | Why It's Good |
|---------|---------------|
| amen-wager-051 | "How many words did Moses write?" (125,139) — Surprising number, good for wagering |
| amen-wager-136 | "How many lepers did Jesus heal?" (10) — Well-known story, good range |

---

### 4. amen-quip.json (504 items)

**Grade:** B  
**Verdict:** 🟢 **SHIP WITH MINOR NOTES**

**OVERALL ASSESSMENT:**

Good variety of fill-in-the-blank prompts. Most are funny and appropriate. Some near-duplicates and a few duds.

**RECOMMENDED CUTS:**

| Item ID | Reason |
|---------|--------|
| amen-quip-042 | "The title of a Christian dating show" — Could be awkward in church setting |
| amen-quip-089 | "What the youth pastor says when caught in the snack closet at 2am" — Slightly suggestive |

**NEAR-DUPLICATES:**

| Item ID ≈ Item ID | What's Similar |
|-------------------|----------------|
| Multiple | Many "What [Bible character] would say if..." prompts with similar structures |
| Multiple | Several "Proverbs for people who..." with similar joke structures |

**STANDOUT ITEMS:**

| Item ID | Why It's Great |
|---------|----------------|
| amen-quip-001 | "The church bulletin typo that caused chaos" — Classic church humor |
| amen-quip-015 | "The text you send when you're running late to small group" — Relatable |
| amen-quip-023 | "The worst possible name for a Christian rock band" — Fun creative prompt |

---

### 5. amen-drawing.json (228 items)

**Grade:** B+  
**Verdict:** 🟢 **SHIP**

**OVERALL ASSESSMENT:**

Well-crafted drawing prompts with good difficulty progression. Most are drawable in 60 seconds and have clear visual subjects.

**MINOR NOTES:**

| Item ID | Issue | Suggested Fix |
|---------|-------|---------------|
| Hard items | Some "Hard" prompts may be too complex for 60 seconds | Test drawing times |

**STANDOUT ITEMS:**

| Item ID | Why It's Great |
|---------|----------------|
| Easy examples | "Noah waving animals up the ark ramp in the rain" — Clear visual |
| Medium examples | "Jesus breaking bread at the Last Supper" — Iconic, drawable |
| Hard examples | "A choir member tripping over a microphone cable" — Funny and challenging |

---

### 6. amen-ranking.json (168 items)

**Grade:** B  
**Verdict:** 🟢 **SHIP**

**OVERALL ASSESSMENT:**

Good variety of ranking topics. Most create genuine debate. Some may have obvious orderings.

**MINOR NOTES:**

Some rankings may have culturally-determined "correct" answers that could reduce debate.

**STANDOUT ITEMS:**

Good mix of biblical character comparisons and modern church life scenarios.

---

### 7. amen-dilemma.json (185 items)

**Grade:** B  
**Verdict:** 🟢 **SHIP WITH MINOR NOTES**

**OVERALL ASSESSMENT:**

Fun "would you rather" scenarios. Most create genuine tough choices.

**WEAK ITEMS:**

| Item ID | Issue |
|---------|-------|
| Some items | A few options are obviously better/worse, reducing debate |

---

### 8. amen-history.json (230 items)

**Grade:** F  
**Verdict:** 🔴 **NEEDS WORK — CRITICAL ISSUES**

**CRITICAL ISSUES:**

**Placeholder Data:** Items 016-230 have placeholder values:
```json
"answer": 0,
"acceptableRange": { "min": -50, "max": 50 }
```

This is ~215 items with NO actual answer data. They appear to be template items that were never filled in.

| Item ID Range | Issue |
|---------------|-------|
| amen-hist-016 through amen-hist-230 | All have answer: 0, range: -50 to 50 |

**TYPO:**

| Item ID | Issue | Fix |
|---------|-------|-----|
| amen-hist-231 | "Annuciation" should be "Annunciation" | Fix spelling |

**REPAIR PLAN:**

1. Either remove items 016-230 entirely
2. Or populate with actual historical dates and appropriate ranges
3. Current state is completely unplayable

---

### 9. amen-headsup.json (25 decks)

**Grade:** A-  
**Verdict:** 🟢 **SHIP**

**OVERALL ASSESSMENT:**

Well-organized, good variety of difficulty levels, appropriate for the game mechanic.

**MINOR NOTES:**

- Some decks (Tribes of Israel, Kings of Judah/Israel) may be too obscure for general audiences
- Consider adding easier decks for mixed-age groups

**STANDOUT DECKS:**

| Deck | Why It's Good |
|------|---------------|
| amen-hu-016 (Sunday Morning) | Relatable church humor |
| amen-hu-018 (Christian Pop Culture) | Good for younger players |
| amen-hu-010 (Parables of Jesus) | Educational and playable |

---

### 10. amen-easter-special.json (55 items)

**Grade:** A-  
**Verdict:** 🟢 **SHIP**

**OVERALL ASSESSMENT:**

Hand-curated quality. Good mix of trivia and reflection. Appropriate Easter tone.

**MINOR NOTES:**

Clean, appropriate, ready to ship.

---

### 11. amen-good-friday.json (23 items)

**Grade:** A  
**Verdict:** 🟢 **SHIP**

**OVERALL ASSESSMENT:**

Excellent tone. Respectful but engaging. Good reflection prompts.

**STANDOUT FEATURE:**

The reflection section adds depth beyond just trivia.

---

## Cross-Pack Issues

### Duplicate Facts Across Packs

The following facts appear in multiple packs — players may see the same information twice in one session:

| Fact | Appears In |
|------|------------|
| Noah's flood (40 days rain) | Trivia (056), Wager (001, 056, 165, 200), History |
| Noah's ark (8 people) | Wager (002, 057, 166) |
| Abraham's age when Isaac born | Wager (004, 059) |
| 12 disciples | Wager (005, 060), Trivia |
| 7 days of creation | Trivia, Wager (054, 199) |
| Jonah and the fish | Trivia (003, 210), Fibbage |
| Judas betrayal | Trivia (005, 208), Fibbage |

### Inconsistencies Between Packs

| Issue | Location |
|-------|----------|
| "How many days did it rain?" — some packs say 40, some may vary | Cross-check all 40-day references |

---

## Overrepresented Themes (Across All Packs)

| Theme | Appears In | Recommendation |
|-------|------------|----------------|
| Noah's Ark | Trivia, Wager, Fibbage, History | Consider trimming 50% of these — it's overrepresented |
| Genesis stories (Joseph, Abraham) | Trivia (heavy), Fibbage, Wager | Diversify — add more NT, prophets, wisdom literature |
| David & Goliath | Trivia (multiple), Fibbage | Consolidate to 2-3 best items |
| Exodus/Plagues | Trivia, Fibbage, Heads Up | Good coverage, but check for duplicates |

---

## Recommended Action Plan

### Immediate (Before Any Ship):

1. **FIX TRIVIA:** Regenerate incorrect answers for items 049-500 OR remove those items
2. **FIX HISTORY:** Either populate items 016-230 with real data OR remove them
3. **REMOVE DUPLICATES:** Cut duplicate questions from Wager pack (~30 items)
4. **FIX TYPOS:** Correct spelling errors (interrupt/interpret, Annuciation)

### Short-term (Before Full Release):

1. Audit all "too easy" Fibbage items — remove common knowledge questions
2. Review Wager fun facts for consistency (items 210-242 need polish)
3. Add more variety to Trivia topics (minor prophets, wisdom literature)
4. Test drawing prompts for 60-second feasibility

### Long-term:

1. Implement duplicate detection across all packs
2. Create content guidelines document for future packs
3. Add playtesting feedback loop before content goes live

---

## Final Recommendation

**DO NOT SHIP** the current content without fixes. The trivia and history packs have critical data corruption that makes them unplayable.

**Minimum viable ship:** Fix trivia items 049-500 and history items 016-230 (or remove them), fix wager duplicates.

**Estimated fix time:** 8-12 hours for trivia incorrect answer regeneration, 2-3 hours for other fixes.
