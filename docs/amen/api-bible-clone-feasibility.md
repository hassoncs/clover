# API.Bible Clone — Feasibility & Capability Analysis

**Purpose**: Educational analysis of what API.bible does, how hard it would be to replicate the core functionality, and what tech stack to use.

---

## 1. What API.Bible Actually Is

API.Bible (by American Bible Society) is a **REST API gateway** to the Digital Bible Library (DBL). It provides a unified JSON interface to ~2,500 Bible translations across ~1,600 languages. It's essentially a **content delivery API with licensing middleware** — it doesn't own most of the Bible text data, it proxies it from DBL with access control, format normalization, and usage tracking.

### The core value proposition:
1. **Format unification** — Bible texts come in wildly different markup formats (USFM, USX, OSIS, proprietary XML). API.Bible normalizes everything into a single JSON + HTML response format.
2. **Licensing gateway** — Copyrighted translations (NIV, ESV, NLT, NASB, etc.) require publisher agreements. API.Bible aggregates those licensing relationships.
3. **FUMS tracking** — "Find, Use, Make, Share" analytics tracking required by publishers as a condition of access.
4. **Developer experience** — Simple API key auth, decent docs, standardized verse addressing.

---

## 2. Complete API Surface

### Base URL: `https://api.scripture.api.bible/v1`

### Authentication
- **Method**: API key via `api-key` HTTP header
- **No OAuth, no JWT** — just static API keys tied to registered applications
- Keys are scoped to specific Bible translations you've been approved for

### Endpoints (Complete List)

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 1 | GET | `/bibles` | List all Bibles accessible to your API key |
| 2 | GET | `/bibles/{bibleId}` | Get a specific Bible's metadata |
| 3 | GET | `/bibles/{bibleId}/books` | List books in a Bible |
| 4 | GET | `/bibles/{bibleId}/books/{bookId}` | Get a specific book |
| 5 | GET | `/bibles/{bibleId}/books/{bookId}/chapters` | List chapters in a book |
| 6 | GET | `/bibles/{bibleId}/chapters/{chapterId}` | Get a chapter (with content) |
| 7 | GET | `/bibles/{bibleId}/chapters/{chapterId}/verses` | List verses in a chapter |
| 8 | GET | `/bibles/{bibleId}/verses/{verseId}` | Get a specific verse |
| 9 | GET | `/bibles/{bibleId}/passages` | Get a passage (verse range) |
| 10 | GET | `/bibles/{bibleId}/search` | Full-text search within a Bible |
| 11 | GET | `/bibles/{bibleId}/books/{bookId}/sections` | List sections in a book |
| 12 | GET | `/bibles/{bibleId}/chapters/{chapterId}/sections` | List sections in a chapter |
| 13 | GET | `/bibles/{bibleId}/sections/{sectionId}` | Get a specific section |
| 14 | GET | `/audio-bibles` | List audio Bibles |
| 15 | GET | `/audio-bibles/{audioBibleId}` | Get a specific audio Bible |
| 16 | GET | `/audio-bibles/{audioBibleId}/books` | List books in an audio Bible |
| 17 | GET | `/audio-bibles/{audioBibleId}/books/{bookId}` | Get a specific audio book |
| 18 | GET | `/audio-bibles/{audioBibleId}/books/{bookId}/chapters` | List chapters in audio book |
| 19 | GET | `/audio-bibles/{audioBibleId}/chapters/{chapterId}` | Get an audio chapter |

### That's it. ~19 endpoints. It's a read-only CRUD API.

### Key Query Parameters

| Parameter | Used On | Purpose |
|-----------|---------|---------|
| `language` | `/bibles` | Filter by ISO 639-3 language code |
| `abbreviation` | `/bibles` | Filter by Bible abbreviation |
| `name` | `/bibles` | Filter by Bible name |
| `include-chapters` | Books | Include chapter summaries |
| `include-chapters-and-sections` | Books | Include chapters + section titles |
| `include-notes` | Chapters/Verses/Passages | Include footnotes |
| `include-titles` | Chapters/Verses/Passages | Include section titles |
| `include-chapter-numbers` | Chapters/Verses/Passages | Include chapter numbers |
| `include-verse-numbers` | Chapters/Verses/Passages | Include verse numbers |
| `include-verse-spans` | Chapters/Verses/Passages | Wrap verses in `<span>` tags |
| `parallels` | Chapters | Comma-delimited list of parallel Bible IDs |
| `content-type` | Content endpoints | `html`, `json`, or `text` |
| `query` | Search | Search query string |
| `sort` | Search | Sort order (`relevance` or `canonical`) |
| `range` | Search | Limit search to book range (e.g., `MAT-REV`) |
| `offset` / `limit` | Search | Pagination |

### Response Format

Every response wraps data in:
```json
{
  "data": { ... },
  "meta": {
    "fums": "...",
    "fumsId": "uuid",
    "fumsJsInclude": "cdn.scripture.api.bible/fums/fumsv2.min.js",
    "fumsJs": "var _BAPI=_BAPI||{}; ..."
  }
}
```

The `meta.fums*` fields are **mandatory** — publishers require you to load the FUMS tracking JavaScript to record every scripture view. This is their analytics/compliance mechanism.

### Content Format

Bible text is returned as **HTML strings** with custom CSS classes (they provide `scripture.css`). Example:
```html
<span data-number="16" class="v">16</span>
<p class="p">For God so loved the world...</p>
```

### Verse Addressing System
Uses a canonical coordinate system:
- **Book**: 3-letter code (e.g., `MAT`, `GEN`, `REV`)
- **Chapter**: `{bookId}.{chapterNum}` (e.g., `MAT.1`)
- **Verse**: `{bookId}.{chapterNum}.{verseNum}` (e.g., `JHN.3.16`)
- **Passage range**: `{start}-{end}` (e.g., `MAT.1.12-MAT.1.20`)

### Rate Limits & Pricing

| Plan | Price | API Calls/Month | Copyrighted Bibles | Commercial Use |
|------|-------|-----------------|---------------------|----------------|
| Starter | Free | 5,000 | Pick 3 | Non-commercial only |
| Pro | $29+/mo | 150,000 | Full access | Yes (licensing fees per Bible) |
| Custom | Contact | Enterprise | Full | Yes |

- Max 500 consecutive verses per request
- Overage: ~$1/1,000 additional calls
- Commercial licensing: $10-$250/mo per copyrighted Bible (tiered by users)

### Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Invalid ID supplied |
| 401 | Missing/invalid API key |
| 404 | Resource not found |

---

## 3. What's NOT Hard About This

Let's be real about what API.Bible actually does technically:

1. **It's a read-only REST API** — no writes, no real-time, no websockets, no complex business logic
2. **~19 endpoints** — small API surface area
3. **Simple auth** — API key in a header, no OAuth flows
4. **No complex queries** — straightforward lookups by ID and basic full-text search
5. **Static data** — Bible text doesn't change. This is essentially a fancy CDN for structured text.
6. **No user-generated content** — no comments, no highlights, no bookmarks, no social features

---

## 4. What IS Hard About This

### 4A. Data Acquisition (THE hard part — 80% of the effort)

**This is where API.Bible's real moat lives.** They have licensing agreements with publishers for copyrighted translations:

| Translation | Status | Publisher |
|-------------|--------|-----------|
| KJV | Public Domain | Free |
| ASV | Public Domain | Free |
| WEB | Public Domain | Free |
| NIV | Copyrighted | Zondervan/HarperCollins |
| ESV | Copyrighted | Crossway |
| NLT | Copyrighted | Tyndale |
| NASB | Copyrighted | Lockman Foundation |
| NKJV | Copyrighted | Thomas Nelson |
| CSB | Copyrighted | Holman |
| MSG (The Message) | Copyrighted | NavPress |
| Amplified | Copyrighted | Lockman Foundation |

**If you only want public domain texts**, this is very doable. There are ~100+ public domain/Creative Commons translations readily available.

**If you want NIV/ESV/NLT**, you need publisher agreements. API.Bible/ABS has decades of relationships. You'd be starting from zero.

### Available Free Data Sources

| Source | What | Format | Scale |
|--------|------|--------|-------|
| [OSIS XML files](https://github.com/openscriptures) | Open Scripture collections | OSIS XML | ~20 translations |
| [HelloAO/bible-api](https://github.com/HelloAOLab/bible-api) | 1,000+ translations, JSON API | Pre-built JSON | Massive, MIT licensed |
| [Digital Bible Library (DBL)](https://thedigitalbiblelibrary.org/) | Official source, ~2,500 translations | USX/USFM | Requires DBL card |
| [eBible.org](https://ebible.org/) | Creative Commons translations | USFM | ~100+ translations |
| [unfoldingWord](https://www.unfoldingword.org/) | Open-licensed translations | USFM | ~50+ translations |
| CrossWire SWORD modules | Community translations | SWORD format | ~200+ |

### 4B. Format Normalization

Bible text comes in multiple markup formats, each with its own quirks:

| Format | Used By | Complexity |
|--------|---------|------------|
| **USFM** (Unified Standard Format Markers) | Most publishers, DBL | Medium — backslash-delimited markup, ~100 marker types |
| **USX** (Unified Scripture XML) | DBL, newer translations | Medium — XML-based, well-structured |
| **OSIS** (Open Scripture Information Standard) | Academic, open-source | High — complex XML schema, very verbose |
| **GBF** (General Bible Format) | Legacy/older tools | Low — simple but dated |

Building a robust parser that handles all these + edge cases (poetry formatting, footnotes, cross-references, red-letter text, section headings, introductions) is a solid 2-3 weeks of work.

### 4C. Versification Mapping

Different translations number verses differently. The Protestant Bible has 31,102 verses (KJV), but Catholic Bibles include deuterocanonical books, and some translations merge or split verses. Mapping `John 3:16` in KJV to the same verse in a translation that numbers differently is non-trivial.

The standard solution is a **versification mapping table** (like the one in Paratext). This is a known-hard problem in Bible software.

### 4D. Full-Text Search

Simple keyword search on ~31K verses × N translations. This is well-solved:
- **SQLite FTS5** works great for moderate scale
- **Elasticsearch/Meilisearch** for large scale
- No semantic/vector search needed — just keyword matching with language-aware tokenization

---

## 5. Clone Architecture — The Minimal Build

### Recommended Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Runtime** | Hono on Cloudflare Workers | Cheapest, fastest, zero cold starts, global edge |
| **Database** | Cloudflare D1 (SQLite) | Free tier is generous, FTS5 built-in, edge-local |
| **Cache** | Cloudflare KV or R2 | Bible text is static — cache everything aggressively |
| **Auth** | API key middleware | Simple header check, no OAuth needed |
| **Search** | D1 FTS5 | Built into SQLite, no separate search service needed |

**Why Hono on Workers over Next.js?**
- This is a pure API — no SSR, no React, no frontend
- Workers have 0ms cold start vs Next.js serverless cold starts
- D1 (SQLite at the edge) is perfect for read-heavy, static-data APIs
- Free tier: 100K requests/day, 5M D1 reads/day — way more generous than needed
- Hono is the standard framework for Workers, ~14KB, full TypeScript

**Why NOT Next.js?**
- You don't need a frontend framework for a REST API
- Next.js API routes are fine but overkill — more dependencies, slower cold starts
- If you want a dashboard/docs site later, deploy that separately

### Data Model (D1/SQLite)

```sql
-- Core tables
CREATE TABLE bibles (
  id TEXT PRIMARY KEY,          -- e.g., 'de4e12af7f28f599-01'
  abbreviation TEXT NOT NULL,    -- e.g., 'KJV'
  name TEXT NOT NULL,
  name_local TEXT,
  description TEXT,
  language_id TEXT NOT NULL,     -- ISO 639-3
  language_name TEXT NOT NULL,
  language_name_local TEXT,
  script TEXT,                   -- e.g., 'Latin'
  script_direction TEXT DEFAULT 'LTR',
  type TEXT DEFAULT 'text',      -- 'text' or 'audio'
  country_ids TEXT,              -- JSON array
  copyright TEXT,
  info TEXT,                     -- HTML info block
  updated_at TEXT
);

CREATE TABLE books (
  id TEXT NOT NULL,              -- e.g., 'MAT'
  bible_id TEXT NOT NULL,
  abbreviation TEXT,
  name TEXT NOT NULL,
  name_long TEXT,
  position INTEGER NOT NULL,
  PRIMARY KEY (bible_id, id)
);

CREATE TABLE chapters (
  id TEXT NOT NULL,              -- e.g., 'MAT.1'
  bible_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  number TEXT NOT NULL,
  position INTEGER NOT NULL,
  content TEXT,                  -- HTML content
  verse_count INTEGER,
  PRIMARY KEY (bible_id, id)
);

CREATE TABLE verses (
  id TEXT NOT NULL,              -- e.g., 'JHN.3.16'
  bible_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  content TEXT NOT NULL,         -- HTML content
  position INTEGER NOT NULL,
  PRIMARY KEY (bible_id, id)
);

CREATE TABLE sections (
  id TEXT NOT NULL,
  bible_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  chapter_id TEXT,
  title TEXT NOT NULL,
  content TEXT,
  first_verse_id TEXT,
  last_verse_id TEXT,
  PRIMARY KEY (bible_id, id)
);

-- Full-text search
CREATE VIRTUAL TABLE verses_fts USING fts5(
  bible_id,
  book_id,
  verse_id,
  content,
  tokenize='porter unicode61'
);
```

### API Implementation (Hono)

```typescript
// src/index.ts — the entire API is ~300 lines
import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono<{ Bindings: { DB: D1Database } }>()

app.use('*', cors())
app.use('/v1/*', apiKeyAuth())  // simple middleware checking api-key header

// All Bibles
app.get('/v1/bibles', async (c) => {
  const lang = c.req.query('language')
  const query = lang
    ? 'SELECT * FROM bibles WHERE language_id = ?'
    : 'SELECT * FROM bibles'
  const results = await c.env.DB.prepare(query).bind(lang).all()
  return c.json({ data: results.results })
})

// Single Bible
app.get('/v1/bibles/:bibleId', ...)

// Books, chapters, verses, passages, search — all simple
// SELECT queries with a few joins

export default app
```

---

## 6. Effort Estimate — 5 Agent Team

### Phase 1: Core API (1-2 days)

| Agent | Task | Time |
|-------|------|------|
| Agent 1 | Scaffold Hono project, D1 schema, deploy pipeline | 2-3 hours |
| Agent 2 | Implement all 19 REST endpoints | 4-6 hours |
| Agent 3 | Build USFM/USX parser to ingest Bible data into D1 | 6-8 hours |
| Agent 4 | Build data ingestion pipeline (download from open sources → parse → insert into D1) | 4-6 hours |
| Agent 5 | API key auth, rate limiting, error handling, CORS | 2-3 hours |

### Phase 2: Search & Polish (1 day)

| Agent | Task | Time |
|-------|------|------|
| Agent 1 | FTS5 search implementation with relevance scoring | 3-4 hours |
| Agent 2 | Content formatting options (HTML/JSON/text), `include-*` params | 3-4 hours |
| Agent 3 | Response caching layer (KV or in-memory) | 2-3 hours |
| Agent 4 | OpenAPI spec, interactive docs (Swagger UI) | 3-4 hours |
| Agent 5 | Load testing, edge cases, error scenarios | 3-4 hours |

### Phase 3: Data Loading (1 day)

| Agent | Task | Time |
|-------|------|------|
| Agent 1-5 | Ingest public domain Bibles (KJV, ASV, WEB, + CC translations) | 4-6 hours |
| | Verify data integrity, verse counts, cross-check against references | 2-3 hours |
| | Build seed/migration scripts | 2-3 hours |

### Total: ~3-4 days with 5 agents for a fully functional clone

### What you'd have:
- All 19 API.Bible endpoints, API-compatible responses
- ~20-50 public domain/CC Bible translations loaded
- Full-text search across all loaded translations
- API key authentication and rate limiting
- Deployed globally on Cloudflare Workers edge network
- Interactive API documentation

### What you'd NOT have:
- Copyrighted translations (NIV, ESV, NLT, etc.) — requires publisher deals
- Audio Bible support (requires audio file hosting + streaming)
- FUMS tracking system (not needed for your own service)
- The DBL integration pipeline
- The developer portal / dashboard UI

---

## 7. Existing Open-Source Alternatives

Before building anything, consider these:

| Project | URL | What It Is |
|---------|-----|------------|
| **HelloAO Bible API** | [bible.helloao.org](https://bible.helloao.org) | 1,000+ translations, JSON API, MIT licensed, no API key needed, hosted on AWS. This is basically already what you'd build. |
| **BibleBridge** | [holybible.dev](https://holybible.dev/api-docs) | Production SaaS Bible API with OpenAPI spec, stable canonical coordinates, verse alignment |
| **Bible Brain (FCBH)** | [faithcomesbyhearing.com](https://faithcomesbyhearing.com/bible-brain/api-reference) | Audio + text, OpenAPI 3.0, Postman collection, huge audio library |
| **GetBible** | [getbible.net](https://getbible.net) | Open-source, multiple formats |

**Honest assessment**: HelloAO Bible API (MIT licensed, 1,000+ translations, no keys, no rate limits) already does 90% of what an API.Bible clone would do. You might just want to self-host that.

---

## 8. Bottom Line

| Dimension | Difficulty | Notes |
|-----------|------------|-------|
| **API surface** | Easy (2/10) | 19 read-only endpoints, simple REST |
| **Data model** | Easy (3/10) | Hierarchical: Bible → Book → Chapter → Verse |
| **Auth & rate limiting** | Easy (2/10) | API key header + counter |
| **Search** | Medium (4/10) | FTS5 handles it, but multi-language tokenization has edge cases |
| **Format parsing (USFM/USX)** | Medium (5/10) | The hardest engineering work — lots of edge cases in markup |
| **Data acquisition (public domain)** | Easy (3/10) | Plenty of open sources |
| **Data acquisition (copyrighted)** | Very Hard (9/10) | Requires publisher relationships you don't have |
| **Audio Bible** | Hard (7/10) | Large file hosting, streaming, licensing |
| **Scale/performance** | Easy (2/10) | Static data, aggressive caching, Workers handles it |

**Overall: If you're happy with public domain + CC translations, this is a weekend project. If you need NIV/ESV/NLT, it's a business development project, not an engineering project.**

The tech is trivial. The moat is licensing relationships.
