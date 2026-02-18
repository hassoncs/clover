# Data Directory

External data sources used during content generation. All source data has been ingested into the amen content packs (`api/src/party/content/packs/amen/`) and the original cloned repos have been deleted.

## Original Sources (Ingested & Deleted)

| Source | License | Items | Ingested Into |
|--------|---------|-------|---------------|
| [Theographic](https://github.com/robertrouse/theographic-bible-metadata) | CC BY-SA 4.0 | 3,067 people, 1,274 places, 450 events | amen-headsup, amen-fibbage, amen-history, amen-wager, amen-trivia |
| [BibleQuizzle](https://github.com/Samleo8/BibleQuizzle) | MIT | 205 Q&A | amen-trivia |
| [OpenTriviaQA](https://github.com/ga642381/OpenTriviaQA) | MIT | Religion/Faith subset | amen-trivia |
| bible-trivia-alpaca | — | JSONL trivia | amen-trivia |

## Adapters (Still Available)

The content pipeline adapters can re-ingest from GitHub URLs if needed:

- `packages/content-pipeline/src/ingest/adapters/amen/theographic.ts`
- `packages/content-pipeline/src/ingest/adapters/amen/biblequizzle.ts`
- `packages/content-pipeline/src/ingest/adapters/amen/opentriviaqa.ts`
- `packages/content-pipeline/src/ingest/adapters/amen/alpaca-trivia.ts`
