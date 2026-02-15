# Audit Events Implementation

## Completed: 2026-02-15

### What was implemented

1. **Migration file**: `api/migrations/20260215_audit_events.sql` (pre-existing)
2. **Schema update**: Added `audit_events` table to `api/schema.sql`
3. **Audit service**: `api/src/services/audit-service.ts`
4. **Integration**: Added audit logging to:
   - `admin-tools.ts`: generateSound, generateVoice, generatePartyContent, seedDatabase
   - `admin.ts`: backfillContentHash
5. **Tests**: `api/src/services/__tests__/AuditService.test.ts` (8 tests passing)

### Key design decisions

- **Non-blocking**: Audit failures are caught and logged, never break operations
- **Snake_case actions**: Action types use `admin.generate_sound` format (matching existing service convention)
- **No PII in metadata**: Metadata should not contain sensitive data like full prompts
- **Simple API**: `logEvent({ actorId, action, targetType?, targetId?, metadata? })`

### Action types defined

```typescript
type AuditAction =
  | "admin.generate_sound"
  | "admin.generate_voice"
  | "admin.generate_party_content"
  | "admin.seed_database"
  | "admin.backfill_content_hash";
```

### Usage pattern

```typescript
const audit = new AuditService(ctx.env.DB);
await audit.logEvent({
  actorId: ctx.user.id,
  action: "admin.generate_sound",
  metadata: { outputName: input.outputName, sizeBytes: audio.byteLength },
});
```

### Gotchas

- The migration file already existed before this task started
- The audit service already existed but lacked error handling - added try-catch
- Action types in the service use snake_case, not camelCase
