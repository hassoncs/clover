# Amen Content Tone & Design Philosophy

> The single reference document for all AI-generated and human-curated content across amen.games.
> Every generation prompt, adapter, and content review should be measured against this document.

---

## The North Star

**Laugh with believers about being human, not at faith.**

If you can say "this could be played at a church retreat and everyone feels good afterward," you're in the right zone. The games should feel like the best youth group night you've ever had — warm, a little chaotic, genuinely funny, and nobody gets hurt.

---

## Core Design Philosophy (Jackbox Principles for Church)

### 1. Players Are the Content

The prompts are scaffolding. The real entertainment is what the group produces. Every prompt should be designed so that *the players' answers* are the show — not the prompt itself.

**Implication for content:** Optimize for output volume and shareability. The best prompts are ones where you immediately want to see what everyone wrote.

### 2. Comedy Through Constraint

Players are funnier when they're boxed in: short character limits, weird formats, forced frames ("fill in the blank," "write a headline," "pitch a product"). Don't ask people to "be funny." Give them a narrow shape that forces funny collisions.

**Implication for content:** Every prompt should have a specific format or frame. Never open-ended "write something funny about the Bible."

### 3. Funny-by-Default Prompts

The prompt should do 70% of the work. Almost any answer has comedic potential because the setup is already absurd, socially pointed, or surprising. If a prompt only works when someone writes a genius answer, it's a bad prompt.

**Implication for content:** Test prompts by imagining the *most boring possible answer*. If even that answer gets a chuckle from the group, the prompt is good.

### 4. Permission Structure (Safe to Be Silly)

The game creates a vibe where it's okay to be dumb, messy, or mediocre. Everyone is producing content, and failure is funny too. This is *especially* important in a church context where people might feel pressure to be "appropriately reverent."

**Implication for content:** Frame the game world as inherently playful. Use setting names like "Camp Amen," "Fellowship Hall FM," "First Church of Snacks." Make it clear this is a fun universe.

### 5. Laughter via Misalignment

The core comedy pattern: serious frame + ridiculous content, or ridiculous frame + sincere content. The mismatch makes it pop.

**Implication for content:** Use formal presentation (game show host energy, dramatic music, "official" scoring) to amplify absurd player input. Biblical language + modern situations = instant comedy.

### 6. Voting as Comedy Selection

Voting is about letting the room curate what's funniest for *this* group, not about finding the "best" answer. Keep stakes playful.

**Implication for content:** Rename voting categories: "Most Wholesome," "Biggest Youth Group Energy," "Most Unexpectedly Profound," "Most 'Amen' Moment."

---

## Comedy Zones: Where to Find the Funny

### ✅ GREEN ZONE (Always Safe)

These targets produce reliable humor without touching sacred ground:

**Church Life & Culture**
- Potluck dynamics ("the dish Sister Linda brought again")
- Fellowship hall moments
- Parking lot after church
- Volunteering chaos ("kids' ministry on a sugar high")
- "Christianese" as a language quirk
- Church announcements gone wrong
- Worship band struggles
- Small group icebreakers
- Sunday morning getting-ready chaos
- The church coffee quality spectrum

**Biblical Situations Played for Relatability**
- Bible characters in modern situations ("Moses' Yelp review of the Red Sea crossing")
- Modern-day equivalents of biblical events
- "What would [Bible character] post on social media?"
- Bible-times job applications, résumés, dating profiles
- Reimagining Bible stories as reality TV, news broadcasts, or podcasts
- Bible characters' mundane daily problems

**Universal Human Experience (Through a Faith Lens)**
- Prayer life struggles (distraction, falling asleep, "was that You, God, or just my lunch?")
- Trying to find the right verse when someone asks
- That moment when the sermon feels personal
- Gentle self-deprecation about faith journeys
- Mission trip packing disasters
- Camp counselor stories

### ⚠️ YELLOW ZONE (Handle With Care)

These can work but need careful framing:

- Denominational differences → Only as gentle "we're all in this together" humor, never "your tradition is weird"
- Old Testament violence → Reference the *situation* but don't make the violence the joke
- Biblical romance → Song of Solomon references are fine as "oh my" moments, not sexually explicit
- Church leadership → Light "pastor problems" humor, never mean-spirited about specific roles

### 🚫 RED ZONE (Never)

- God, Jesus, or the Holy Spirit as the butt of a joke
- Mocking prayer, communion, baptism, salvation, or suffering
- Trauma, shame, purity culture as comedy
- Cynical takes on faith
- Sexual content, profanity, or mean-spirited "dunking"
- Denominationally divisive theology (predestination, baptism method, Eucharist, tongues, end-times, papal authority, creation timeline)
- Making light of persecution or martyrdom

---

## Per-Game Tone Guide

### Trivia (The Great Hall of Wisdom)

**Role of content:** The questions ARE the game. Players don't create content here — they're testing knowledge.

**Tone:** Warm game-show energy. Questions should feel like a fun challenge, not a Sunday School exam. Mix genuine knowledge tests with surprising/delightful facts.

**Good question:**
> "What did Ehud have in common with many left-handed people today? He was left-handed — and it helped him defeat King Eglon! (Judges 3:15)"

**Bad question:**
> "In what year did the Israelites cross the Jordan River? (Joshua 3:14-17)"
> *(Too academic. No delight factor.)*

**Content source priority:** Verified datasets (BibleQuizzle, OpenTriviaQA, Theographic). AI only for wrong-answer generation, not the questions themselves.

---

### Quiplash (The Fellowship Table)

**Role of content:** Prompts are the *scaffolding*. Players write the punchlines. The prompt must make any answer at least a little funny.

**Tone:** Warm absurdity. Youth-group-meets-improv-night. The frame should be specific enough that even a boring answer gets a laugh.

**Good prompts:**
> "The church announcement nobody expected this Sunday: _____"
> "A new worship song title about losing your car keys: _____"
> "What the pastor is actually thinking during the 7th verse of 'Just As I Am': _____"
> "A proverb for people who always bring store-bought cookies to the potluck: _____"
> "The name of a self-help book written by Jonah: _____"

**Bad prompts:**
> "Something funny about the Bible: _____" *(Too open. No constraint.)*
> "Moses' favorite color: _____" *(No comedic potential in any answer.)*

**Prompt categories (rotate across these):**
1. Church-life situations (potlucks, announcements, worship, volunteering)
2. Bible character + modern situation mashups
3. "A proverb for people who _____"
4. Fake titles (books, songs, movies, TV shows with biblical twist)
5. "The worst/best/most surprising thing about _____"
6. "What [Bible character] would say if _____"

**Content source:** AI-generated, grounded in real verse text from API.Bible where possible. Human review ALL prompts for tone.

---

### Fibbage (Scrolls of Truth)

**Role of content:** The fact is the challenge. Players write *plausible-sounding fake answers* to trick each other. The real answer must be surprising enough that fakes are believable.

**THE KEY INSIGHT: Blanks should be WORDS and PHRASES, not numbers.** A number isn't tricky — everyone just guesses a random number. Words force players to think creatively about what *sounds right*.

**Tone:** "Wait, THAT's the real answer?!" Genuine surprise. The fun is in the reveal.

**Good fibbage questions:**
> "According to the Bible, the name of Moses' wife was _____." → Answer: "Zipporah"
> "The apostle Paul's job before becoming a missionary was _____." → Answer: "tentmaker"
> "The animal that spoke to Balaam in Numbers 22 was a _____." → Answer: "donkey"
> "King Nebuchadnezzar spent seven years living as a _____ in the wilderness." → Answer: "wild animal" (eating grass)
> "The judge who defeated an army using only trumpets and _____ was Gideon." → Answer: "clay jars with torches"

**Bad fibbage questions:**
> "Methuselah lived to be _____ years old." → Answer: "969" *(Just a number. Not tricky.)*
> "The number of plagues was _____." → Answer: "10" *(Everyone can guess this.)*

**Design rules for fibbage content:**
1. The blank should be a noun, name, place, or descriptive phrase — NOT a number
2. The real answer should be surprising but verifiable in scripture
3. Players should be able to write plausible-sounding alternatives
4. The surrounding sentence should give just enough context to make fakes possible, but not enough to make the answer obvious

**Content source:** Theographic data (names, places, occupations, descriptions), API.Bible for fact verification. NO AI generation of the facts themselves.

---

### Year Jinx (The Book of Ages)

**Role of content:** Events with verifiable dates. Players estimate years. The fun is in how wrong (or surprisingly right) people are, and the "jinx" when two people guess the same year.

**Tone:** "How old IS this stuff?!" Mix of biblical and church history events so the timeline feels epic.

**Content source:** Theographic events (all 450 have dates). Supplement with well-known church history milestones. This is the one game type where numbers ARE the answer, and that's fine — it's an estimation game.

---

### Ranking (The Council)

**Role of content:** The topic is the debate starter. The fun is in the group arguing about order. Rankings should be OPINION-based, not fact-based.

**Tone:** "Friendly argument at the fellowship table." The topic should spark immediate disagreement.

**Good ranking prompts:**
> "Rank these Bible characters by who you'd most want on your road trip"
> "Rank these miracles by how useful they'd be in modern life"
> "Rank these Biblical jobs from easiest to hardest"
> "Rank these church potluck dishes from best to worst"
> "Rank these excuses for being late to church"
> "Rank these Bible characters as wedding DJs"

**Bad ranking prompts:**
> "Rank these books by word count" *(Factual. No debate.)*
> "Rank these disciples by number of mentions" *(Trivia, not opinion.)*

**Design rule:** If there's one objectively correct answer, it's a trivia question, not a ranking prompt. Rankings should have no "right" order — just opinions.

**Content source:** AI-generated topics using Theographic categories (real names/places), but the *criteria* should be subjective/fun. Human review all.

---

### Dilemma (The Crossroads)

**Role of content:** Two options that split the room. The author wins points when the vote is close to 50/50. The fun is in seeing how the group divides and hearing the arguments.

**Tone:** Mix of epic biblical choices and relatable church-life absurdity.

**Good dilemmas:**
> "Would you rather lead worship with a terrible singing voice OR give the sermon with no preparation?"
> "Would you rather spend a year as Jonah inside the whale OR 40 days on Noah's Ark?"
> "Would you rather only be able to quote King James English OR only be able to speak in parables?"
> "Would you rather organize VBS for 200 kids OR chaperone the youth group ski trip?"
> "Would you rather have Moses' staff OR Samson's strength?"

**Bad dilemmas:**
> "Would you rather have wisdom OR strength?" *(Too generic. No biblical flavor.)*

**Prompt categories:**
1. Biblical superpowers / artifacts ("Moses' staff vs David's sling")
2. Biblical situations to survive ("whale belly vs lion's den")
3. Church volunteer roles (comedy of service)
4. Modern faith-life trade-offs
5. "Bible character problems" made relatable

**Content source:** AI-generated, human reviewed. Ground in specific biblical references.

---

### Drawing (Illustrated Scripture)

**Role of content:** The secret prompt tells one player what to draw. Others see the drawing and write fake titles. The fun is in bad drawings and creative bluffing.

**Tone:** Visual, specific, drawable in 60 seconds. Not just "Noah's Ark" — give scenes with specific moments.

**Good drawing prompts:**
> "Moses dropping the tablets when he sees the golden calf"
> "Jonah being yeeted out of the whale"
> "David's sling mid-swing at Goliath"
> "The disciples' faces when Jesus walks on water"
> "Balaam arguing with his talking donkey"
> "Peter trying to walk on water and sinking"

**Bad drawing prompts:**
> "Faith" *(Abstract. Can't draw it.)*
> "The Sermon on the Mount" *(Too complex for 60 seconds.)*

**Design rule:** Every prompt should have a clear central *action* or *moment*. Verbs matter more than nouns.

**Content source:** Mix of curated iconic moments + AI-generated deeper cuts. API.Bible for scene discovery.

---

### Heads Up (Who Am I?)

**Role of content:** Character name on the screen, one player guesses from clues. The fun is in the clue-giving and the "OH YEAH!" moment of recognition.

**Tone:** Party energy. Names must be recognizable enough that most church-going players can give clues.

**Design rule:** If the average youth group kid hasn't heard of the person, they shouldn't be in the main deck. Obscure characters go in "expert" bonus decks.

**Content source:** Theographic people, filtered by verseCount ≥ 5 for main decks. Group into thematic decks. This is data extraction, not generation.

---

## The System Prompt (for AI Generation)

This replaces the current `AMEN_SYSTEM_PREFIX`. Every generation call should use this as the system message:

```
You are a comedy writer for Amen, a Christian party game platform. Think of yourself as a head writer at a studio that makes Jackbox-style games for church groups, youth retreats, and family game nights.

YOUR JOB: Create content that turns a room full of believers into a comedy machine. The prompts are scaffolding — the players create the real entertainment.

COMEDY PHILOSOPHY:
- The prompt should do 70% of the work. Almost any answer should be at least a little funny.
- Comedy comes from CONSTRAINT. Specific formats, narrow frames, forced collisions.
- Use the comedy of misalignment: biblical/formal language + modern/mundane situations.
- Aim for warm absurdity, not edge. "Youth group at midnight" energy.

WHERE TO FIND THE FUNNY:
- Church life: potlucks, fellowship halls, worship bands, volunteering, announcements, parking lots
- Bible characters in modern situations: social media, job interviews, reality TV, Yelp reviews
- Relatable faith moments: prayer distractions, finding the right verse, that "was that sermon about me?" feeling
- Gentle "we've all been there" humor about being a person of faith in the modern world
- Absurd combinations and playful "what if" scenarios

THE RESPECT LINE:
- Laugh WITH believers about being human, not AT faith
- Never mock God, Jesus, the Holy Spirit, or sacred practices (prayer, communion, baptism)
- Bible stories are a shared world to play in, not a target
- No cynicism, no shame humor, no "gotcha" theology
- The vibe check: "Would this land at a church retreat with all ages present?"

DENOMINATIONAL SAFETY:
- Be ecumenical — welcoming to Catholics, Protestants, and Orthodox
- Avoid: predestination/free will, baptism method, Eucharist theology, Mary/saints veneration, speaking in tongues, end-times/rapture specifics, papal authority, ordination debates, creation timeline
- When in doubt, make the joke about HUMAN behavior, not doctrine

TONE: Warm, silly, a little chaotic, fundamentally kind. Like the best camp counselor you ever had running a game show.
```

---

## Content Review Checklist

Before any content ships, it should pass these filters:

1. **The Retreat Test:** Could this be played at a church retreat and everyone feels good afterward?
2. **The Pastor's Mom Test:** Would this joke work if your pastor's mom was watching?
3. **The Fun Test:** Is the first instinct "ooh, fun!" or "hmm, educational"? (If the second, rewrite.)
4. **The Constraint Test:** Does the prompt give players a specific shape to fill, or is it open-ended?
5. **The Default Test:** If someone writes the most boring possible answer, is it still at least a little funny?
6. **The Respect Test:** Is the humor aimed at human experience, not at God or doctrine?
7. **The Variety Test:** Does the full pool cover church life, Bible characters, modern faith, and absurd scenarios — not just one category?
