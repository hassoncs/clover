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
