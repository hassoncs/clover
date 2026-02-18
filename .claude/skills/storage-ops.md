---
name: storage-ops
description: "Database and storage operations. Covers Cloudflare D1 (SQLite), R2 object storage, Supabase auth, migrations, BlobStore, asset uploads, wallet transactions, and party content sync. Use when working on database queries, migrations, blob storage, auth, or syncing party content."
---

# Storage Operations

> D1, R2, Supabase auth, migrations, BlobStore

## When to Use This Skill

Load when working on: database queries, D1, R2, migrations, schema changes, blob storage, asset uploads, Supabase auth, wallet transactions, party content sync

## Key Concepts

- **D1 (SQLite)**: Primary relational store, queried via raw prepared statements (NOT Drizzle ORM queries)
- **R2**: Content-addressed object storage via `BlobStore` (SHA-256 keyed)
- **No KV**: Caching/rate-limiting done via D1 tables
- **Supabase**: Auth only; user data mirrored to D1 `users` table
- **Drizzle ORM**: Used for schema modeling in `shared/src/schema/` but NOT for queries in `api/`

## Common Patterns

### D1 Queries
```typescript
const result = await this.db.prepare("SELECT * FROM table WHERE id = ?").bind(id).first();
```

### Atomic Batch Operations
```typescript
await this.db.batch([
  this.db.prepare("INSERT INTO wallet_transactions ...").bind(...),
  this.db.prepare("UPDATE user_wallets SET balance = balance + ? WHERE user_id = ?").bind(amount, userId),
]);
```

### R2 via BlobStore
```typescript
const hash = await blobStore.put(buffer); // Returns SHA-256 hash
const data = await blobStore.get(hash);   // Retrieve by hash
```
Key format: `blobs/${hash.slice(0, 2)}/${hash}`. Public access via `/assets/{key}` with `Cache-Control: immutable`.

### Migrations
- Schema in `api/schema.sql`
- Migration files in `api/migrations/`
- Local: `pnpm db:push`
- Remote: `pnpm db:push:remote`

### Supabase Auth
```typescript
const { data: { user } } = await supabase.auth.getUser(token);
```
User data synced to D1 `users` table on first interaction.

## Gotchas

- NEVER use Drizzle query builders in `api/` — always raw D1 prepared statements
- Always use `db.batch()` for multi-table atomic operations (wallet, billing)
- R2 keys are content-hashed — same content = same key (automatic dedup)
- Schema changes require BOTH `schema.sql` update AND a migration file in `api/migrations/`
- Always use `BlobStore` for uploads — never write to R2 directly

## File References

| File | Purpose |
|------|---------|
| `api/schema.sql` | Primary D1 schema definition |
| `api/migrations/` | D1 migration files |
| `shared/src/schema/` | Drizzle ORM type definitions |
| `api/src/services/BlobStore.ts` | R2 content-addressed storage |
| `api/src/economy/wallet-service.ts` | D1 batch pattern example |
| `api/wrangler.toml` | Cloudflare bindings (DB, ASSETS) |

## Related Skills

- [agent-orchestration](agent-orchestration.md) — Uses D1 for threads/messages
- [testing-patterns](testing-patterns.md) — D1/R2 mocking strategies

## Party Content Database

Party game content (trivia, quips, dilemmas, etc.) is stored in D1 with the following tables:
- `party_content` — Content items with JSON body, brand, type, status
- `party_content_assets` — Audio/image assets linked to content
- `party_content_reviews` — Quality/humor ratings from reviewers
- `party_content_snapshots` — Versioned snapshots for publishing

### Architecture

```
D1 Database (canonical)
       │
       ├──► Admin UI (content review, rating, publishing)
       │
       └──► App (live fetch at runtime, no bundling)
```

The database is the single source of truth. JSON files in `api/src/party/content/packs/` are backup/seed files.

### Content Sync Commands

```bash
# Import JSON packs into D1 (upsert)
pnpm --filter @slopcade/api content:import --target local   # JSON → local D1
pnpm --filter @slopcade/api content:import --target remote  # JSON → prod D1

# Export D1 content to JSON files (backup)
pnpm --filter @slopcade/api content:export --target local   # local D1 → JSON
pnpm --filter @slopcade/api content:export --target remote  # prod D1 → JSON
```

**Options:**
- `--brand <amen|slopcade>` — Filter by brand
- `--type <contentType>` — Filter by type (trivia, quip, fibbage, etc.)
- `--dry-run` — Preview without executing

**Examples:**
```bash
# Seed production from JSON files
pnpm --filter @slopcade/api content:import --target remote

# Export production content for backup
pnpm --filter @slopcade/api content:export --target remote

# Export only Amen trivia
pnpm --filter @slopcade/api content:export --target local --brand amen --type trivia

# Preview import without executing
pnpm --filter @slopcade/api content:import --target remote --dry-run
```

### Content Types

| Type | Description |
|------|-------------|
| `trivia` | Multiple choice questions with correct/incorrect answers |
| `quip` | Short funny phrases |
| `dilemma` / `wyr` | Would you rather choices (optionA/optionB) |
| `fibbage` | Fill-in-the-blank with real answer |
| `estimation` | Numeric estimation questions |
| `drawing` | Drawing prompts |
| `ranking` | Items to rank in order |
| `headsup` | Heads Up word packs |
| `wordlist` | Word lists for word games |
| `personal` | Personal questions |
| `FakeWord` | Fake word definitions |
| `caption` | Caption prompts |
| `wordgame` | Word game content |

### File References

| File | Purpose |
|------|---------|
| `api/scripts/sync-party-content.ts` | Bidirectional sync script |
| `api/src/party/content/packs/` | JSON content packs by brand |
| `api/src/trpc/routes/party-content.ts` | tRPC routes for content CRUD |
| `shared/src/schema/party-content.ts` | Drizzle schema definitions |

## Consolidated from docs/ (2026-02-17)

### Game Progress Persistence System

A type-safe system for saving and loading game progress (high scores, level progression, unlockables) across sessions.

#### Core Components
- **`GameProgressManager`**: Core logic for load/save/validate/migrate.
- **`useGameProgressFromDefinition`**: React hook for easy integration with `GameDefinition`.
- **`BaseGameProgressSchema`**: Zod base schema for all game progress.

#### Implementation Pattern

1. **Define Schema**:
```typescript
export const MyGameProgressSchema = BaseGameProgressSchema.extend({
  currentLevel: z.number().default(1),
  highScore: z.number().default(0),
});
```

2. **Configure Game**:
```typescript
persistence: {
  storageKey: "my-game-progress",
  schema: MyGameProgressSchema,
  version: 1,
  autoSave: { onGameWin: true, onBackground: true },
}
```

3. **Use Hook**:
```typescript
const { progress, updateProgress, saveProgress } = useGameProgressFromDefinition<MyGameProgress>(game);
```

#### Key Features
- **Type Safety**: Runtime validation via Zod catches corrupted data.
- **Schema Migration**: Versioned schemas with `migrateSchema` support.
- **Cross-Platform**: Works on web (localStorage) and native (AsyncStorage).
- **Auto-Save**: Configurable triggers (win, lose, background, interval).
- **Storage Format**: JSON namespaced as `game-progress-{gameId}`.
