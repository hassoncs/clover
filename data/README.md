# Data Directory

External data sources for content generation. These are cloned repos, not checked into git.

## Setup

```bash
# Clone Theographic Bible Metadata (3,067 people, 1,274 places, 450 events, 66 books)
git clone --depth 1 https://github.com/robertrouse/theographic-bible-metadata.git data/external/theographic-bible-metadata

# Clone BibleQuizzle (205 trivia questions with scripture references)
git clone --depth 1 https://github.com/Samleo8/BibleQuizzle.git data/external/BibleQuizzle
```

## Data Sources

| Source | License | Items | Format | Used By |
|--------|---------|-------|--------|---------|
| [Theographic](https://github.com/robertrouse/theographic-bible-metadata) | CC BY-SA 4.0 | 3,067 people, 1,274 places, 450 events | JSON | Heads Up character decks, trivia generation, fibbage facts |
| [BibleQuizzle](https://github.com/Samleo8/BibleQuizzle) | MIT | 205 Q&A | JSON | Seed trivia for Quickfire Q&A |

## Adapters

The content pipeline has ready-to-use adapters for ingesting this data:

- `packages/content-pipeline/src/ingest/adapters/amen/theographic.ts`
- `packages/content-pipeline/src/ingest/adapters/amen/biblequizzle.ts`

## Usage

```bash
# Ingest BibleQuizzle trivia
pnpm content cli -- ingest --source=biblequizzle --game-type=amen-trivia --local-file=data/external/BibleQuizzle/questions.json

# Ingest Theographic data
pnpm content cli -- ingest --source=theographic --game-type=amen-trivia --local-file=data/external/theographic-bible-metadata/json/people.json
```
