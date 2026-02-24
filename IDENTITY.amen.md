# Identity: Amen

Brand bible for the Amen product. Every UI decision, content generation prompt, marketing copy, and customer interaction should be measured against this document.

---

## One Line

**Jackbox Games for churches.**

## Tagline

Scripture. Fellowship. Fun.

## What It Is

Amen is a collection of 8+ interactive party games designed for church groups, youth retreats, and family game nights. A host casts to a TV or projector. Players join on their phones with a 4-digit code at amen.games. No app download required to play.

## What It Is Not

- Not a Bible study app
- Not a solo trivia game
- Not an "educational" product (it's entertainment first, learning second)
- Not Slopcade with a skin — users have zero awareness of the platform underneath

## Relationship to Slopcade

Amen is a white-labeled product built on the Slopcade platform. Separate domain, separate accounts, separate app store listings, separate branding. One shared backend. The codebase lives in `apps/amen/`. The brand enum is `"amen"` in content pipeline and API routes.

---

## Audience

| Segment | Entry Point | Why They Buy |
|---------|-------------|--------------|
| **Youth Pastors** | Wednesday night game time | Need engaging tools that keep students off their phones (by putting the game ON their phones) |
| **Family Ministry Directors** | Church-wide fellowship events | Need scalable group activities for 20-200 people |
| **Christian Families** | Family game night / devotionals | Want faith-based alternatives to secular entertainment |
| **Homeschool Co-ops** | Bible study icebreakers | Need educational games that reinforce scripture |

**Primary buyer**: Youth pastors. Earliest tech adopters in churches, always searching for engagement tools, active in online communities where word-of-mouth spreads fast.

**Market**: ~370,000 US congregations. 86% of church leaders say technology is vital for community connection.

---

## Visual Identity

### Colors

| Role | Color | Hex |
|------|-------|-----|
| Primary | Deep Navy | `#1B3A6B` |
| Accent | Gold | `#C9A84C` |
| Secondary Accent | Deep Purple | `#4C1D95` |
| Background | Warm Cream | `#FFFBF0` |
| Text | Near Black | `#1A1A2E` |
| Success | Forest Green | `#166534` |
| Error | Deep Red | `#991B1B` |

### Typography

| Role | Font | Weight |
|------|------|--------|
| Headings | Lora (Serif) | Bold |
| Body | Inter | Regular |
| Game UI | Inter | Medium / Bold |

### Design Principles

- **Warm, not sterile.** The app should feel like a well-lit fellowship hall, not a hospital waiting room.
- **Reverent but fun.** Gold and deep navy communicate quality and trust. The overall vibe is "premium church event," not "cheesy VBS craft."
- **Joyful, not loud.** Celebratory moments (correct answers, wins) should feel like genuine delight, not a casino slot machine.
- **Modern, not trendy.** Clean typography, generous whitespace, subtle animations. Nothing that will look dated in two years.
- **Accessible.** All color combinations must meet WCAG AA contrast ratios. Font sizes must be readable on phone screens at arm's length.

### Do's and Don'ts

| Do | Don't |
|----|-------|
| Focus on togetherness — show people laughing, engaging | Use "cheesy" or dated church aesthetics |
| Use warm, inviting imagery | Use complex theological jargon in UI |
| Reference scripture naturally | Make the app feel like a sermon |
| Celebrate with gold accents | Use neon, glitch, or chaos aesthetics |

---

## Voice & Tone

### The North Star

**Laugh WITH believers about being human, not AT faith.**

If you can say "this could be played at a church retreat and everyone feels good afterward," you're in the right zone.

### Character

Think of Amen as **the best camp counselor you ever had running a game show.** Warm, silly, a little chaotic, fundamentally kind.

### Writing Style

- **Warm over corporate.** "Let's play!" not "Commence gameplay."
- **Encouraging over competitive.** "The race isn't over yet!" not "DESTROYED!"
- **Celebratory over hyperbolic.** "Well done, good and faithful servant!" not "CHAMPION!"
- **Specific over generic.** Reference church culture naturally — potlucks, fellowship halls, youth group trips.

### Content Voice Examples

| Context | Amen Says | Amen Never Says |
|---------|-----------|-----------------|
| Player wins | "Well done, good and faithful servant!" | "DESTROYED!" |
| Waiting for players | "Gathering the flock..." | "Waiting for losers..." |
| Wrong answer | "Not quite! Keep seeking." | "WRONG!" |
| Timer running out | "Time is a gift — but it's running out!" | "HURRY UP!" |
| Lobby message | "Invite your neighbors to join!" | "Tell your friends!" |

### Comedy Zones

**Green Zone (Always Safe)**:
- Church life: potlucks, fellowship halls, worship bands, volunteering, parking lots
- Bible characters in modern situations: social media, job interviews, reality TV
- Relatable faith moments: prayer distractions, finding the right verse, "was that sermon about me?"
- Gentle "we've all been there" humor about being a person of faith

**Yellow Zone (Handle With Care)**:
- Denominational differences — only as "we're all in this together" humor
- Old Testament events — reference the situation, don't make violence the joke
- Church leadership — light "pastor problems," never mean-spirited

**Red Zone (Never)**:
- God, Jesus, or the Holy Spirit as the butt of a joke
- Mocking prayer, communion, baptism, salvation, or suffering
- Cynical takes on faith
- Divisive theology: predestination, baptism method, Eucharist, tongues, end-times, papal authority, creation timeline

### Content Review Checks

1. **The Retreat Test:** Could this be played at a church retreat and everyone feels good afterward?
2. **The Pastor's Mom Test:** Would this joke work if the pastor's mom was watching?
3. **The Fun Test:** Is the first instinct "ooh, fun!" or "hmm, educational"?
4. **The Respect Test:** Is the humor aimed at human experience, not at God or doctrine?

---

## Platforms

| Platform | URL / Identifier | Port (Dev) |
|----------|-----------------|------------|
| Web | [amen.games](https://amen.games) | 8086 |
| iOS | `games.amen.app` (bundle ID) | — |
| Android | `games.amen.app` (package) | — |
| Landing | [amen.games](https://amen.games) | — |

**Metro port**: 8086 (can run simultaneously with Slopcade on 8085).

---

## Pricing

### Individual

| Tier | Price | Access |
|------|-------|--------|
| Free | $0 | 3 party hostings/month, 4 players max |
| Amen+ | $4.99/mo or $39.99/yr | Unlimited hosting, 12 players max |

### Church (Organization)

| Tier | Attendance | Monthly | Annual |
|------|-----------|---------|--------|
| Small | Up to 100 | $24 | $199 |
| Medium | 101-500 | $59 | $499 |
| Large | 501-2,000 | $119 | $999 |
| Mega | 2,000+ | Custom | Custom |

---

## Games at Launch

| Game | Internal Name | Format |
|------|--------------|--------|
| The Great Hall of Wisdom | trivia | Fast-paced Bible trivia |
| The Fellowship Table | quip | Fill-in-the-blank (Quiplash) |
| Scrolls of Truth | fibbage | Spot the real Bible fact |
| The Book of Ages | estimation | Guess when events happened |
| Illustrated Scripture | drawing | Draw Bible scenes, guess |
| Who Am I? | headsup | Guess the Bible character |
| The Crossroads | dilemma | Would-you-rather moral scenarios |
| The Council | ranking | Rank Bible topics |

---

## Content Pipeline

Content is AI-generated, scripture-referenced, theologically reviewed, and ecumenically safe across Catholic, Protestant, and Orthodox traditions.

- **Brand enum**: `"amen"` in `partyContent` API routes
- **System prompt**: Defined in `docs/amen/amen-content-tone-guide.md`
- **Content types**: quip, trivia, drawing, dilemma, wyr, estimation, fibbage, caption, wordgame, wordlist, personal, FakeWord, ranking, headsup, chroma
- **Source data**: API.Bible, Theographic (verified biblical data), BibleQuizzle, OpenTriviaQA
- **Review**: All content passes AI review (quality + humor scoring) before activation

---

## Key Contacts

| Role | Contact |
|------|---------|
| Press | press@amen.games |
| Support | support@amen.games |
| Website | [amen.games](https://amen.games) |
