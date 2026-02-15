# Audit Events Implementation

## Schema Decisions

### Table: `audit_events`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | TEXT PRIMARY KEY | nanoid (21 chars) for unique event ID |
| `actor_id` | TEXT NOT NULL | User ID who performed the action |
| `action` | TEXT NOT NULL | Action type (e.g., `admin.generate_sound`) |
| `target_type` | TEXT | Optional: type of target entity (game, user, asset) |
| `target_id` | TEXT | Optional: ID of target entity |
| `metadata_json` | TEXT | Optional: JSON metadata (no PII) |
| `created_at` | INTEGER NOT NULL | Unix timestamp in milliseconds |

### Indexes

- `idx_audit_events_actor` - Query by actor
- `idx_audit_events_action` - Query by action type
- `idx_audit_events_created_at` - Time-based queries
- `idx_audit_events_target` - Query by target (composite: target_type, target_id)

## Action Naming Convention

Actions follow the pattern: `{category}.{verb}`

Examples:
- `admin.generate_sound`
- `admin.generate_voice`
- `admin.generate_party_content`
- `admin.seed_database`
- `admin.backfill_content_hash`

## Integration Points

### Admin Tools (`admin-tools.ts`)
- `generateSound` - logs outputName, sizeBytes
- `generateVoice` - logs outputName, voicePreset, sizeBytes
- `generatePartyContent` - logs game, promptCount
- `seedDatabase` - logs targets, seeded

### Admin (`admin.ts`)
- `backfillContentHash` - logs batchSize, processed, skipped

## PII Considerations

- Never store full request bodies in metadata
- Only store identifiers and aggregate counts
- User input (prompts, text) should NOT be logged

## Files Created/Modified

- `api/migrations/20260215_audit_events.sql` - Migration file
- `api/schema.sql` - Added audit_events table definition
- `api/src/services/audit-service.ts` - AuditService class
- `api/src/services/__tests__/audit-service.test.ts` - Tests
- `api/src/trpc/routes/admin-tools.ts` - Integrated audit logging
- `api/src/trpc/routes/admin.ts` - Integrated audit logging
