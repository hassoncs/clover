# Amen Bible Data Sources — Complete Catalog

> **Purpose:** Comprehensive reference of all known free/open data sources for Bible-themed party game content.
> **Usage:** Consult when sourcing new content, designing new game types, or expanding existing content pools.
> **Last updated:** Feb 16, 2026

---

## Currently Integrated Sources

These are already cloned/downloaded and have working pipeline adapters:

| Source | Location | Adapter | Items | License |
|--------|----------|---------|-------|---------|
| Theographic Bible Metadata | `data/external/theographic-bible-metadata/` | `theographic.ts`, `theographic-fibbage.ts`, `theographic-headsup.ts`, `theographic-history.ts`, `theographic-wager.ts` | 3,067 people, 1,274 places, 450 events, 66 books | CC BY-SA 4.0 |
| BibleQuizzle | `data/external/BibleQuizzle/` | `biblequizzle.ts` | 205 Q&A | MIT |
| Bible Trivia Alpaca | `data/external/bible-trivia-alpaca/` | `alpaca-trivia.ts` | 1,290 Q&A | Apache 2.0 |
| OpenTriviaQA | `data/external/OpenTriviaQA/` | `opentriviaqa.ts` | 638 MCQ (religion-faith) | CC BY-SA 4.0 |
| API.Bible | Live API (rest.api.bible/v1) | `api-bible.ts` | Full Bible text (NIV, NLT, NKJV, KJV) | API key required, 5K/day |

---

## Priority Sources to Integrate Next

### Tier 1 — High Impact, Easy Integration

#### MetaV Database
- **URL:** github.com/theonize/KJV-bible-database-with-metadata-MetaV-
- **License:** CC BY-SA 3.0
- **Format:** SQLite, SQL, CSV
- **What it has:** Every KJV word linked to: people (with aliases, relationships, groups), places (with lat/long), chronological data (Ussher's Annals), Strong's Concordance (Hebrew + Greek), Nave's Topical Bible, Treasury of Scripture Knowledge cross-references, word-level metadata
- **Tables:** PeopleRelationships, PeopleAliases, PeopleGroups, PlaceAliases, Topics, TopicVerses, StrongsWords, CrossReferences
- **Game potential:** Family tree games, geography rounds, timeline challenges, topical categorization, word study mechanics. This is the single richest structured resource.
- **Integration effort:** Medium — download SQLite, write adapter to query specific tables

#### Creeds.json
- **URL:** github.com/NonlinearFruit/Creeds.json
- **License:** Unlicense (public domain equivalent)
- **Format:** JSON (explicitly built for software applications)
- **What it has:** Westminster Shorter Catechism (107 Q&As), Westminster Larger Catechism, Heidelberg Catechism (129 Q&As), Belgic Confession, Canons of Dort, Apostles'/Nicene/Athanasian/Chalcedonian Creeds. Each question maps to answer with scripture proof texts.
- **Game potential:** "Complete the Answer" rounds, "Which Creed Said This?" games, catechism trivia
- **Integration effort:** Low — pure JSON, direct import
- **Caution:** Catechisms are denominationally specific. Use ecumenically or label clearly.

#### scrollmapper/bible_databases
- **URL:** github.com/scrollmapper/bible_databases
- **License:** Public domain
- **Format:** MySQL, SQLite, JSON, CSV, XML
- **What it has:** 5 translations + 340K cross-references in one repo
- **Game potential:** "What verse connects to this verse?" games, deep trivia
- **Integration effort:** Low — pre-built SQLite

#### KereszTech/BibleData
- **URL:** github.com/KereszTech/BibleData
- **License:** Not stated (check before commercial use)
- **Format:** JSON lists
- **What it has:** Animals, plants, food, materials, professions, and nations mentioned in the Bible
- **Game potential:** Scattergories-style rounds ("Name 5 animals in the Bible"), category-guessing, rapid-fire listing. PERFECT for party games.
- **Integration effort:** Very low — simple JSON lists

#### OpenBible.info Cross-References
- **URL:** openbible.info (downloadable TSV)
- **License:** CC BY
- **What it has:** 340,000+ verse-to-verse cross-references with user-voted relevance rankings
- **Game potential:** "What connects these verses?" Relevance voting enables difficulty scaling (high-vote = easy, low-vote = hard)
- **Integration effort:** Low — TSV file

### Tier 2 — Medium Impact, Moderate Integration

#### STEPBible-Data (Tyndale House Cambridge)
- **URL:** github.com/tyndale/STEPBible-Data
- **License:** CC BY 4.0
- **Format:** TSV
- **What it has:** TIPNR (every proper noun individualized with family relationships, Strong's numbers, AI descriptions in 3 lengths), Hebrew/Greek lexicons (BDB, LSJ), morphologically tagged texts
- **Game potential:** Word origin games, "What does this name mean?", advanced trivia
- **Integration effort:** Medium — TSV parsing, scholarly data needs cleanup for game use

#### LetsChurch/bible-embeddings (HuggingFace)
- **URL:** huggingface.co/datasets/LetsChurch/bible-embeddings
- **License:** Not stated
- **Format:** Pre-computed vectors (multiple models, 384d-1024d)
- **What it has:** Verse embeddings for semantic search
- **Game potential:** "Find the most similar verse", thematic grouping, AI-powered content generation (find verses about specific topics without keyword search)
- **Integration effort:** Medium — need vector storage/search infrastructure

#### Sweet Publishing Bible Illustrations
- **URL:** Wikimedia Commons / unfoldingWord
- **License:** CC BY-SA 3.0
- **What it has:** 2,358 color illustrations covering Genesis through Revelation, consistent cartoon style
- **Game potential:** Visual rounds, "What story is this?", illustration-based trivia
- **Integration effort:** Medium — need to download, catalog, and tag by passage

#### Hymnary.org Scripture API
- **URL:** hymnary.org/api/scripture
- **License:** Free API
- **What it has:** 1 million+ hymn instances across thousands of hymnals; scripture-to-hymn mapping
- **Game potential:** "Which hymn goes with this verse?" Perfect new game type.
- **Integration effort:** Low — JSON API, no key needed

#### FreeBibleImages Maps
- **URL:** freebibleimages.org
- **License:** CC0 (14 maps)
- **What it has:** Paul's journeys, Exodus route, tribal territories — ready-to-use PNGs
- **Game potential:** Geography game rounds
- **Integration effort:** Very low — download PNGs

### Tier 3 — Specialized / Future Expansion

#### Bible Geography

| Resource | What it adds | License |
|----------|-------------|---------|
| OpenBible.info Geocoding | GeoJSON for 1,342 ancient places with lat/long, confidence levels | CC BY 4.0 |
| Digital Atlas of Roman Empire (DARE) | Map tile server at `dh.gu.se/tiles/imperium/{z}/{x}/{y}.png` | CC BY |
| Pleiades Gazetteer | 37,000+ ancient places with temporal spans | CC BY 3.0 |

#### Audio

| Resource | What it adds | License |
|----------|-------------|---------|
| LibriVox KJV | Complete KJV Bible ~100 hours, MP3/OGG | Public domain |
| Bible Brain API (FCBH) | Audio in 2,200+ languages, verse-level timing | Free API key |
| Open Hymnal Project | Hundreds of hymns with MIDI, sheet music | Public domain |
| Freesound.org | Church bells, organ, cathedral ambience, choir | CC0/CC BY |

#### Catechism / Creed Data (beyond Creeds.json)

| Resource | What it adds | License |
|----------|-------------|---------|
| Baltimore Catechism (Gutenberg #14551) | Catholic Q&A in 33+ lessons | Public domain |
| reubenlillie/daily-office | Book of Common Prayer Lectionary | JSON, open source |
| calendarium-romanum | Liturgical calendar data | MIT |

#### AI/NLP-Ready Data

| Resource | What it adds | Use case |
|----------|-------------|----------|
| bible-nlp/biblenlp-corpus | 833 languages, 5.18 GB | "Guess the language" games |
| BibleSTS (Harvard) | 6 million verse pairs across 18 translations | "Same verse?" comparison games |
| MACULA project (Clear-Bible) | Syntax trees, semantic roles for Hebrew/Greek | "Who did what to whom?" narrative games |
| abhi1nandy2/Bible-roberta-base | RoBERTa fine-tuned on Bible text | AI-powered fill-in-the-blank generation |
| openbibleinfo/Bible-Passage-Reference-Parser | TypeScript library, ~175KB/sec | Parse player-submitted verse references |

#### Visual Assets

| Resource | What it adds | License |
|----------|-------------|---------|
| Gustave Doré illustrations | 241 dramatic engravings (1866) | Public domain |
| FreeBibleImages.org | 1,600+ sets of Bible scenes | CC BY-SA / CC0 varies |
| Open Bible Stories (unfoldingWord) | 50 key stories with illustrations in 60+ languages | CC BY-SA 4.0 |
| Game-Icons.net | Scroll, crown, angel wings, chalice silhouettes | CC BY 3.0 |
| Tabler Icons | Cross, church, candle, book, praying hands | MIT |

#### Denominational / Liturgical

| Resource | What it adds | License |
|----------|-------------|---------|
| LiturgicalCalendarAPI | Catholic feasts, React component included | Open source |
| Church Calendar API (calapi) | Daily celebrations with rank, color | MIT |
| Catholic Readings API | Daily readings + 204 saints with quotes | Open source |
| LectServe | Revised Common Lectionary + ACNA as JSON | No key |
| Corpora religions.json | Christian denominations hierarchy | CC0 |

---

## Bible Text — Public Domain Translations

These translations are confirmed public domain, safe for unrestricted commercial use:

| Translation | Year | Style | Best for |
|------------|------|-------|----------|
| KJV (King James) | 1769 | Formal, archaic | Classic gravitas, recognizability |
| ASV (American Standard) | 1901 | Literal | Accuracy |
| WEB (World English Bible) | Modern | Clear, modern English | Accessibility |
| YLT (Young's Literal) | 1898 | Ultra-literal | Word study |
| BBE (Bible in Basic English) | 1965 | Simple vocabulary | Readability |
| Darby | 1890 | Literal | Study |
| OEB (Open English Bible) | Modern | Modern, inclusive language | Contemporary use |

### Bible Text APIs (no backend required)

| API | Auth | Rate limit | Notes |
|-----|------|------------|-------|
| wldeh/bible-api (jsDelivr CDN) | None | None | 200+ versions, 300+ languages, zero infrastructure |
| bible-api.com (seven1m) | None | 15 req/30s/IP | Natural language query parsing |
| BibleGet I/O | "appid" param | Open | Multi-language |
| API.Bible (ABS) | API key | 5K/day free | NIV, NLT, NKJV — copyrighted translations |
| HelloAO (bible.helloao.org) | None | None | 1,000+ translations, MIT, no rate limits. No NIV/NLT/NKJV. |

---

## License Quick Reference

| License | Commercial OK? | Attribution? | Share-alike? |
|---------|---------------|-------------|-------------|
| Public domain | ✅ | No | No |
| CC0 | ✅ | No | No |
| MIT / ISC / Unlicense | ✅ | Minimal | No |
| CC BY 4.0 / 3.0 | ✅ | Yes | No |
| CC BY-SA 4.0 / 3.0 | ✅ | Yes | Yes (derivatives same license) |
| Apache 2.0 | ✅ | Yes (NOTICE file) | No |
| CC BY-NC | ❌ | Yes | No |
| GPL v3 | ⚠️ | Yes | Yes (code must be GPL) |

**For amen.games commercial use, prioritize:** Public domain, CC0, MIT, CC BY 4.0, CC BY-SA 4.0, Apache 2.0.
**Avoid for commercial:** CC BY-NC (BradyStephenson), GPL v3 (godlytalias, Bible SuperSearch).

---

## New Game Type Ideas Enabled by These Sources

These data sources unlock game types we haven't designed yet:

1. **"Name That Hymn"** — Play MIDI snippet, guess the hymn title (Open Hymnal + Hymnary.org)
2. **"Where in the Bible World?"** — Pin-the-location geography game (OpenBible.info + DARE tiles)
3. **"Scattergories: Bible Edition"** — Name items in biblical categories (KereszTech/BibleData lists)
4. **"Family Feud: Bible Edition"** — Survey-style with cross-reference popularity data (OpenBible.info cross-refs)
5. **"Connections"** — Group 16 words into 4 biblical categories (KereszTech lists + Nave's topics)
6. **"Complete the Creed"** — Fill in missing words from famous creeds (Creeds.json)
7. **"Guess the Translation"** — Same verse in different translations, guess which one (scrollmapper multi-translation)
8. **"What's the Connection?"** — Two verses shown, find the thematic link (cross-references with relevance scoring)
9. **"Bible Pictionary"** — Use Sweet Publishing illustrations as prompts (2,358 images)
10. **"Timeline"** — Place events on a timeline cooperatively (MetaV chronological data)
