# Learnings - Party Content CMS (DB-First)

## 2026-02-18: Schema Creation

### Content Types
- Full list from `api/src/party/content/prompt-loader.ts`: quip, trivia, drawing, dilemma, wyr, estimation, fibbage, caption, wordgame, wordlist, personal, FakeWord, ranking, headsup
- Brands: slopcade, amen

### Asset Paths (from generate-audio.ts)
- Content voice: `audio/voice/{brand}/content/{contentType}/{id}.mp3`
- Transitions: `audio/voice/{brand}/transitions/{id}.mp3`

### Migration Naming Convention
- Format: `YYYYMMDD_description.sql` (e.g., `20260218_party_content_schema.sql`)
- Located in `api/migrations/`

### Schema Patterns
- Drizzle sqlite tables use `text('id').primaryKey()` for IDs
- Timestamps: `integer('col', { mode: 'timestamp' })`
- Soft delete: `deleted_at` column on all content tables
- Foreign keys with cascade: `.references(() => table.id, { onDelete: 'cascade' })`
- Partial indexes: `WHERE deleted_at IS NULL` for active content queries
- CHECK constraints for enum values and score bounds (1-5)

### Tables Created
1. `party_content` - canonical content store with JSON body
2. `party_content_assets` - 1:N R2 asset links (audio, images)
3. `party_content_reviews` - quality/humor ratings (unique per content+reviewer)
4. `party_content_status_transitions` - audit trail for status changes

## 2026-02-18: Import Pipeline

### tRPC Route Location
- Router: `api/src/trpc/routes/party-content.ts`
- Registered in `api/src/trpc/router.ts` as `partyContent`
- Routes: `partyContent.importPacks`, `partyContent.importStatus`

### Database Access Pattern
- Use raw D1 queries via `ctx.env.DB.prepare().bind().run()` - NOT Drizzle ORM
- Context has `ctx.env.DB` (D1Database), not `ctx.db`
- Use `.first<T>()` for single row, `.all<T>()` for multiple rows

### Pack File Structure
- **Amen packs**: `packs/amen/amen-{type}.json` with IDs like `amen-quip-001`
- **Slopcade packs**: `packs/slopcade/{type}.json` with UUID IDs
- Extract brand from directory name, content type from filename

### Content Hashing
- SHA-256 of JSON body for deduplication
- Update only if content_hash differs

### Audio Asset Key Pattern
- `audio/voice/{brand}/content/{contentType}/{contentId}.mp3`
- Skip voice for: headsup, wordlist, FakeWord (no text to narrate)

### Text Extraction by Type
- quip/personal: `text` field
- trivia/fibbage/estimation: `question` field
- drawing: `prompt` field
- ranking: `topic` field
- dilemma/wyr: combine `optionA` + `optionB` as "Would you rather: A, or, B?"

## 2026-02-18: Admin CRUD Routes

### Route Patterns
- All admin routes use `adminProcedure` (requires valid auth + admin email)
- Router: `api/src/trpc/routes/party-content.ts`
- Context: `ctx.env.DB` for D1 access, `ctx.user.id` for admin user ID

### List Route Pattern
- Pagination: default page=1, pageSize=50
- Dynamic WHERE clause construction with params array
- Use `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)` for "latest per group" queries
- Separate count query + data query for pagination
- LEFT JOIN for optional relations (assets, reviews)
- Return `{ items, total, page, pageSize }`

### Upsert Pattern (without ON CONFLICT)
- SQLite's `ON CONFLICT` requires the column to have a UNIQUE constraint
- Manual upsert: SELECT first, then UPDATE or INSERT
- Unique constraint on `(content_id, reviewer_user_id)` for reviews

### Status Transition Pattern
- Always read current status first
- Insert audit row in `party_content_status_transitions`
- Then update content row
- Use `crypto.randomUUID()` for new IDs

### Soft Delete Pattern
- Set `deleted_at = Date.now()` (milliseconds epoch)
- Log transition to 'retired' status
- Restore clears `deleted_at` and transitions back to 'active'

### Filter Pattern
- Use conditional WHERE clause construction
- `includeDeleted` param to override default `deleted_at IS NULL` filter
- Search via `LIKE '%term%'` on body column

### Response Field Naming
- SQL columns use snake_case (`brand_id`, `content_type`)
- API responses use camelCase (`brandId`, `contentType`)
- Transform at the boundary in the route handler

## 2026-02-18: Snapshot Pipeline

### Snapshot Table Design
- `party_content_snapshots` stores immutable point-in-time indexes of active content
- `content_ids` is a JSON string (array of content IDs) — NOT duplicated content body
- Version is auto-incrementing via `SELECT COALESCE(MAX(version), 0) + 1`
- Snapshots are immutable — no update/delete routes

### Publish Route Pattern
- Query active content: `status = 'active' AND deleted_at IS NULL`
- Collect IDs into JSON array, compute count
- Guard against empty publish (throw if contentCount === 0)
- Optional `metadata` input for notes/tags

### Snapshot Query Patterns
- `getSnapshot`: query by version, parse `content_ids` JSON, return camelCase
- `listSnapshots`: return all ordered by version DESC, omit `content_ids` for efficiency
- Both use `adminProcedure`

### Drizzle Schema for Snapshots
- No foreign key references (snapshot is standalone)
- `integer('published_at', { mode: 'timestamp' })` for consistency with other tables
- `.unique()` on version column
- Export insert/select schemas + types following existing pattern
