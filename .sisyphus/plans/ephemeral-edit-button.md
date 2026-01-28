# Ephemeral Edit Button + Ephemeral Editor Mode + Dev Template Seeding

## TL;DR

Add an **Edit** button on Game Detail that always opens an **ephemeral editor session** (zero DB side-effects until explicit Save). Ephemeral sessions load the game definition via a **tokenized cache** (not full JSON in URL). In the editor, add a **Save** action that materializes the ephemeral doc into a DB game (with lineage), then continues in persistent mode. In **dev mode**, add a tRPC endpoint to **seed all template games into the signed-in user’s library** so features requiring a real `gameId` (asset generation, etc.) work without manual forking.

> Note: This deliberately deviates from “definition in URL params” to avoid URL size limits and leaking large JSON into navigation history/logs.

**Estimated Effort**: Medium

---

## Context

### Key Existing References (confirmed)

- Game detail page + existing fork flow:
  - `app/app/game-detail/[id].tsx`
    - Fork flow: `handleFork()` at ~L112-L141, button UI at ~L221-L245.
    - Loads template vs database game metadata at ~L58-L98.

- Editor page already supports loading a definition from a URL param:
  - `app/app/editor/[id].tsx`:
    - Reads `definition` from `useLocalSearchParams` at ~L16-L19.
    - Loads definitionParam via `JSON.parse` at ~L31-L34.
    - DB load path via `trpc.games.get` at ~L34-L37.
    - Uses `gameId={id ?? "preview"}` at ~L82.

- Editor UI lacks a “Save game” action in top bar:
  - `app/components/editor/EditorTopBar.tsx` contains back button, undo/redo, play/edit toggle only.

- Preview mode is currently inferred from `gameId === 'preview'` in asset tooling:
  - `app/components/editor/AssetGallery/AssetGalleryPanel.tsx` uses `const isPreviewMode = gameId === 'preview';` and blocks generation with “Save Game First”.

- API supports create, update, fork, and has Vitest coverage:
  - `api/src/trpc/routes/games.ts`:
    - `create` at ~L133
    - `update` at ~L208
    - `fork` at ~L620
  - `api/src/trpc/routes/games.test.ts` exists and defines a test schema string.
  - DB schema lives in `api/schema.sql`.

---

## Work Objectives

### Core Objective
Implement an “Edit” UX path that **never writes to the DB until Save**, while preserving existing “Fork” behavior and enabling dev-only seeding of templates into user projects.

### Deliverables
- Edit button on game detail that opens ephemeral editor.
- Tokenized ephemeral cache (memory + AsyncStorage/localStorage via `app/lib/utils/storage.ts`).
- Editor “Save” action that:
  - in ephemeral mode: creates a DB game with correct lineage, then routes to `/editor/{newId}`.
  - in persistent mode: updates the existing DB game.
- Dev-only `games.seedTemplates` endpoint + client trigger.
- API tests updated/added for seeding + lineage create.

### Definition of Done
- From any game detail (template or DB), tapping **Edit** opens the editor and **does not create DB rows**.
- From ephemeral editor:
  - Tap **Save** → one new DB game exists, editor navigates to `/editor/{newId}` and no longer counts as preview mode.
  - Tap back/discard → returns to previous screen, no DB side effects.
- In dev mode with auth, templates are seeded idempotently into the user’s game list.

---

## Verification Strategy

### Test Infrastructure
- **API**: Vitest exists (`api/src/trpc/routes/games.test.ts`). Add tests for new routes/behavior.
- **App**: No explicit unit test harness observed here; use **manual QA** + typecheck.

### Required Verification Commands
- API: `pnpm --filter @slopcade/api test:run`
- Type check: `pnpm --filter @slopcade/api type-check` and `pnpm --filter slopcade tsc --noEmit` (or repo-level equivalent)

---

## Architecture Decisions (locked)

### Ephemeral editor navigation
- Use **token + cache**, not full JSON in the URL.
- Implement ephemeral entry via existing route `app/app/editor/[id].tsx` using `id === 'ephemeral'` and a `token` param.
  - Example navigation: `/editor/ephemeral?token=...&returnTo=...&source=template|database&sourceId=...`

### Why not encode definition directly in URL?
- Size limits and encoding complexity; also leaks into logs/history.

---

## Ephemeral cache implementation details

### Approach
**Hybrid cache:**
1) **In-memory Map** for fast access during a single app session.
2) **Persistent fallback** using `app/lib/utils/storage.ts` (AsyncStorage on native, localStorage on web) so navigation/reload doesn’t instantly break.

### Data model
Store payload keyed by a random token:
- `token: string` (e.g., `crypto.getRandomValues`/uuid helper if available)
- payload:
  - `definition: GameDefinition`
  - `title: string` (optional convenience)
  - `description: string | null`
  - `source: { type: 'template'; templateId: string } | { type: 'database'; gameId: string }`
  - `returnTo: { pathname: string; params?: Record<string,string> } | null`
  - `createdAtMs: number`
  - `expiresAtMs: number` (TTL)

### TTL + cleanup
- Default TTL: **30 minutes**.
- On `get(token)`: if expired → delete from both stores and return null.
- On successful Save or Discard: delete token.

### “Session context” requirement
The editor must retain enough context to save correctly:
- whether the current session is ephemeral
- the ephemeral token (for cleanup)
- the ephemeral source info (templateId or parent gameId) to supply to `createFromEphemeral`
- a return target for Discard

Plan approach: add this to `EditorProvider` context (see TODO 4).

### Tradeoffs
- **Memory-only** would break on reload and can be flaky on web refresh.
- **AsyncStorage/localStorage fallback** risks large payload storage; mitigate by:
  - compressing not required (start without)
  - enforcing max JSON size (e.g., 200–500KB) and falling back to definitionParam only for tiny payloads OR showing a clear error.

---

## Database schema changes

### Needed for dev seeding idempotency
Add to `games` table:
- `source_template_id TEXT` nullable

Add index/uniqueness:
- Unique composite index on `(user_id, source_template_id)` **where source_template_id is not null**.
  - If partial unique indexes are problematic in D1, use a non-partial unique index and ensure `source_template_id` is always set for seeded rows (never null for seeded templates).

### Why
Dev seeding must be idempotent to avoid duplicating templates every launch.

### Files to update
- `api/schema.sql` (games table + index)
- `api/src/trpc/routes/games.test.ts` schema string (mirror the column + index)
- `api/src/trpc/routes/games.ts` `GameRow` interface + `toClientGame` mapping (include `sourceTemplateId?: string | null` if needed by UI)

---

## Execution Strategy

### Wave 1 (Core ephemeral editor plumbing)
1) Add ephemeral cache utility
2) Add Edit button → navigate to ephemeral editor
3) Add editor loading path for `id==='ephemeral'` + `token`

### Wave 2 (Save / lineage)
4) Add editor Save UI + behaviors (ephemeral create → persistent, persistent update)
5) Add/extend API to support “create from ephemeral” with lineage + template linkage

### Wave 3 (Dev seeding)
6) Add `games.seedTemplates` API + schema support
7) Add dev-mode trigger in app (auth-gated)

---

## TODOs

> NOTE: References include line ranges from the reads performed in this session. Verify exact line numbers during execution.

### 1. Implement tokenized ephemeral document cache

**What to do**:
- Create: `app/lib/editor/ephemeralGameEditCache.ts` (new)
  - Export:
    - `putEphemeralEdit(payload) -> Promise<{ token: string }>`
    - `getEphemeralEdit(token) -> Promise<payload | null>`
    - `removeEphemeralEdit(token) -> Promise<void>`
- Use `app/lib/utils/storage.ts` helpers (`getStorageItem`, `setStorageItem`, `removeStorageItem`) for persistence.
- Keep a module-scope `Map<string, payload>` as primary cache.
- Add TTL enforcement and cleanup.

**Patterns to follow**:
- Storage adapter pattern in `app/lib/utils/storage.ts`.

**References**:
- `app/lib/utils/storage.ts:11-122` - cross-platform JSON storage helpers to reuse.

**Acceptance Criteria**:
- Able to store and retrieve payload by token.
- Expired tokens are rejected and deleted.
- Payload includes `source` and `returnTo` so the editor can Save and Discard correctly.

---

### 2. Add “Edit” button to game detail page (always ephemeral)

**What to modify**:
- Update: `app/app/game-detail/[id].tsx`
  - Add `isEditing` state similar to `isForking`.
  - Implement `handleEdit()`:
    - If template: `loadTestGame(id)` (already used in this file)
    - If database: `trpc.games.get.query({ id })` (already used)
    - Build payload and store in ephemeral cache to get a token:
      - `source` should be `{ type: 'template', templateId }` or `{ type: 'database', gameId }`
      - `returnTo` should be the current route (so Discard can go back even if `router.back()` is not reliable)
    - Navigate to editor: `router.push({ pathname: '/editor/[id]', params: { id: 'ephemeral', token } })`.
  - Add button UI alongside Fork and Play.

**Key code patterns**:
- Follow existing template-vs-db branching in `handleFork()`.

**References**:
- `app/app/game-detail/[id].tsx:58-98` - loading template vs database game info.
- `app/app/game-detail/[id].tsx:112-141` - fork branching logic.
- `app/app/game-detail/[id].tsx:221-245` - current Fork + Play button row.

**Acceptance Criteria**:
- Edit button appears on both template and database games.
- Tapping Edit does not call `trpc.games.create` or `trpc.games.fork`.

---

### 3. Make editor route support ephemeral token loading

**What to modify**:
- Update: `app/app/editor/[id].tsx`
  - Extend `useLocalSearchParams` to include `token?: string`.
  - Loading priority:
    1) If `id === 'ephemeral'` and `token` present → load from cache.
    2) Else if `definitionParam` present → existing behavior.
    3) Else if `id && id !== 'preview'` → DB load (existing).
  - Choose `gameId` passed to `EditorProvider`:
    - When ephemeral: `gameId='preview'` (so asset/gen gating continues) OR `gameId='ephemeral'` with updated gating logic.
    - Recommendation: keep `gameId='preview'` to reuse existing preview gating.

**References**:
- `app/app/editor/[id].tsx:16-50` - current definitionParam + DB load logic.
- `app/app/editor/[id].tsx:82` - current `EditorProvider gameId` choice.
- `app/components/editor/AssetGallery/AssetGalleryPanel.tsx` uses `gameId === 'preview'` as preview gate.

**Acceptance Criteria**:
- Navigating to `/editor/ephemeral?token=...` loads the cached definition.
- If token missing/expired, shows an error and allows going back.

---

### 4. Add editor “session context” (ephemeral vs persistent) to EditorProvider

**Why this exists**:
The Save/Discard buttons need to know:
- ephemeral token (cleanup)
- lineage source info for `createFromEphemeral`
- return target

**What to modify**:
- Update: `app/components/editor/EditorProvider.tsx`
  - Add optional prop:
    - `session?: { kind: 'persistent' } | { kind: 'ephemeral'; token: string; source: { type: 'template'; templateId: string } | { type: 'database'; gameId: string }; returnTo: { pathname: string; params?: Record<string,string> } | null }`
  - Add these fields to `EditorContextValue`:
    - `sessionKind: 'persistent' | 'ephemeral'`
    - `ephemeralToken?: string`
    - `ephemeralSource?: ...`
    - `returnTo?: ...`

**References**:
- `app/components/editor/EditorProvider.tsx:484-660` - props + context value creation.

**Acceptance Criteria**:
- Other editor components (TopBar) can branch on sessionKind without re-reading route params.

---

### 5. Add explicit “Save” + “Discard” behavior to the editor top bar

**What to modify**:
- Update: `app/components/editor/EditorTopBar.tsx`
  - Add a Save button (e.g., right side near play/edit toggle).
  - Add a Discard button in ephemeral sessions (or make back button behave as discard with confirmation).
  - Save logic:
    - If sessionKind === 'ephemeral':
      - Call `trpc.games.createFromEphemeral.mutate({ title, description, definition, source })`
      - On success:
        - remove ephemeral token from cache
        - `router.replace('/editor/{newId}')`
        - editor now runs in persistent mode
    - Else (persistent):
      - Call `trpc.games.update.mutate({ id: gameId, title, description, definition })`
      - On success: mark editor dirty = false.

  - Discard logic (ephemeral only):
    - If `isDirty`: prompt “Discard changes?”
    - Remove ephemeral token
    - Navigate to `returnTo` if present else `router.back()` else `router.replace('/(tabs)/browse')`

**Key patterns**:
- “Preview mode” concept already exists via `gameId === 'preview'`.

**References**:
- `app/components/editor/EditorTopBar.tsx:1-79` - existing top bar structure.
- `app/components/editor/EditorProvider.tsx:445-659` - exposes `gameId`, `document`, `isDirty`.
- `api/src/trpc/routes/games.ts:create/update` - API contracts.

**Acceptance Criteria**:
- In ephemeral sessions: Save creates a DB game and navigates to `/editor/{id}`.
- In ephemeral sessions: Discard removes ephemeral token and returns to the originating page.
- In persistent sessions: Save updates DB and clears dirty indicator.

---

### 6. API: support “create from ephemeral edit” with lineage + template linkage

**What to modify**:
- Update: `api/src/trpc/routes/games.ts`
  - Add mutation: `createFromEphemeral` (protected)
    - Input:
      - `title`, `description?`, `definition` (string)
      - `source`: either `{ type: 'template', templateId }` or `{ type: 'database', gameId }`
    - Behavior:
      - Parse and validate definition (reuse validation as in `create` and `fork`).
      - If source is database:
        - Fetch existing row (like `fork` does)
        - Enforce: allow if public OR owner (same as fork)
        - Compute `base_game_id = existing.base_game_id ?? existing.id`
        - Set `forked_from_id = existing.id`
      - If source is template:
        - Set `source_template_id = templateId`
        - `base_game_id = newId`, `forked_from_id = null`
      - Insert new row similarly to `fork`, but using provided `definition` (after optionally stamping metadata).

**Schema wiring**:
- Update `GameRow` interface to include `source_template_id?: string | null`.
- Update `toClientGame` to include `sourceTemplateId` if the app will display it.

**References**:
- `api/src/trpc/routes/games.ts:133-206` - create insertion + validation.
- `api/src/trpc/routes/games.ts:620-699` - fork logic + lineage + access checks.
- `api/schema.sql:14-50` - games table + indexes.

**Acceptance Criteria**:
- createFromEphemeral for DB source preserves lineage (`base_game_id`, `forked_from_id`).
- createFromEphemeral for template sets `source_template_id`.
- API tests cover both cases.

---

### 7. Database schema: add `source_template_id` for seeded templates

**What to modify**:
- Update: `api/schema.sql`
  - Add `source_template_id TEXT` column to `games`.
  - Add index/unique constraint for idempotent seeding.

**Update tests schema**:
- Update: `api/src/trpc/routes/games.test.ts` schema string (games table + indexes).

**Acceptance Criteria**:
- Local schema push works.
- Tests create table without errors.

---

### 8. API: dev-only template seeding endpoint

**What to modify**:
- Update: `api/src/trpc/routes/games.ts`
  - Add mutation: `seedTemplates` (protected)
    - Dev-only guard (use env flag available in API; if none, gate by `ctx.env.ENVIRONMENT !== 'production'` or similar project convention)
    - Input: array of templates:
      - `{ templateId: string, title: string, description: string | null, definition: string }`
    - For each template:
      - Upsert/insert if not exists for `(user_id, source_template_id)`
      - Ensure `is_public=0`, `base_game_id=newId`, `forked_from_id=null`, `source_template_id=templateId`
    - Return: counts `{ created, skipped }` + maybe mapping `{ templateId -> gameId }`.

**References**:
- `api/src/trpc/routes/games.ts:create` - validation and insert format.
- `api/schema.sql` - new column and index.

**Acceptance Criteria**:
- Calling seedTemplates twice does not duplicate games.
- Returns stable mapping for already-seeded templates.

---

### 9. App: dev-mode trigger to seed templates for signed-in user

**What to modify**:
- Prefer trigger in `app/app/(tabs)/maker.tsx` (auth-aware) rather than browse.
  - Add a dev-only `useEffect`:
    - If `__DEV__` and authenticated and not yet seeded (persist a boolean in `storage`), then:
      1) Load template definitions (iterate `TESTGAMES` + `loadTestGame` by id)
      2) Call `trpc.games.seedTemplates.mutate({ templates: [...] })`
      3) Refresh my games list

**Rationale**:
- Maker tab already knows auth state (`useAuth`) and shows user games via `trpc.games.list.query()`.

**References**:
- `app/app/(tabs)/maker.tsx:55-80` - fetch list when authenticated.
- `app/app/(tabs)/browse.tsx` - current template list UI (if you also want to show seeded IDs there later).
- `app/lib/utils/storage.ts` - dev flag persistence.

**Acceptance Criteria**:
- In dev, after sign-in, user sees template-derived games in Maker without manual forks.

---

### 10. Update API tests (Vitest)

**What to modify**:
- Update: `api/src/trpc/routes/games.test.ts`
  - Schema string updated for new column/index.
  - Add tests:
    - `seedTemplates` idempotency
    - `createFromEphemeral` with DB source sets `forked_from_id` and correct `base_game_id`
    - `createFromEphemeral` with template source sets `source_template_id`

**References**:
- `api/src/trpc/routes/games.test.ts:7-72` - current schema string and test harness.

**Acceptance Criteria**:
- `pnpm --filter @slopcade/api test:run` passes.

---

## Manual QA Checklist (App)

1) **Template game → Edit → Discard**
- Open browse → pick template → game detail → Edit
- Confirm editor opens and you can modify
- Hit back, confirm returns to detail
- Confirm no new game appears in Maker list

2) **Template game → Edit → Save**
- Repeat, but Save
- Confirm navigates to `/editor/{newId}`
- Confirm Maker list contains new game
- Confirm Fork still works separately

3) **Community DB game → Edit → Save**
- From browse/community → detail → Edit
- Modify and Save
- Confirm new game created with lineage (verify via API response or DB inspection)

4) **Dev seeding**
- In dev mode, sign in → open Maker
- Confirm templates are seeded (only once)

5) **Persistent editor Save**
- Open an existing user game `/editor/{id}`
- Make a small change
- Tap Save
- Confirm dirty dot clears and re-opening the game shows the change persisted

---

## Risks / Pitfalls

- Storing full GameDefinition JSON in AsyncStorage/localStorage can exceed platform limits; enforce max payload size and clear error UI.
- Ensure `createFromEphemeral` uses fork-like access rules when source is a DB game (public or owner).
- Ensure editor “preview gating” stays correct: features like asset generation remain blocked until saved.
- If dev seeding loads full definitions via `loadTestGame`, do it sequentially or with a small concurrency limit to avoid long startup spikes.
