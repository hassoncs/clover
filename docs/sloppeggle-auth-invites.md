# Slop Peggle fixes + Game Maker email-invite login

## Context

### User request summary
1. **Slopeggle (Peggle game)**
   - Fix aiming/trajectory line that appears **90° off**.
   - Add **animated portal visuals** (GIF/sprite animation research + implementation).
   - QC Peggle rules: ball reset at bottom, only one ball at a time, launches at cursor.

2. **Game Maker login**
   - Replace “Game Maker” 🎮 emoji hero with a generated **“Slopcade” hero title image**.
   - Simplify login to **email-only** (remove invite-code UI).
   - **Comment out Google login** for now.
   - Replace invite codes with **invite-by-email**.
   - Database should **track who invited whom** via email.

### Relevant code context (already known)
- Slopeggle definition:
  - `app/lib/test-games/games/slopeggle/game.ts`
    - `templates.trajectoryLine` at ~`361-374`
    - trajectory line entity at ~`473-477`
    - portals at ~`313-350` and entities `portal-a`/`portal-b` at ~`443-459`
    - trajectory spawn/destroy rules at ~`483-502`
- rotate-to-touch behavior:
  - `app/lib/game-engine/behaviors/MovementBehaviors.ts` `rotate_toward` at ~`96-135`
  - `RotateTowardBehavior.offset` is interpreted as **degrees**.
- animation behavior exists:
  - `app/lib/game-engine/behaviors/LifecycleBehaviors.ts` `animate` handler at ~`238-264`
  - NOTE: it updates `runtime.state.currentFrame` → we must verify the renderer/visual pipeline actually consumes this.

- Game Maker screen:
  - `app/app/(tabs)/maker.tsx` login hero emoji at ~`201`, InviteCodeInput used at ~`209`.
  - Invite gating currently disables buttons when `!validatedInviteCode`.
- Invite code component:
  - `app/components/auth/InviteCodeInput.tsx` uses `trpcReact.economy.validateSignupCode`.

- Existing invite-code data model (D1):
  - `api/schema.sql` tables `signup_codes` + `signup_code_redemptions` at ~`453-486`
  - Services/routes:
    - `api/src/economy/signup-code-service.ts`
    - `api/src/trpc/routes/economy.ts` `validateSignupCode` at ~`93-119`

- User sync:
  - `app/hooks/useAuth.ts` calls `trpc.users.syncFromAuth.mutate()`
  - `api/src/trpc/routes/users.ts` implements `syncFromAuth`.

### Constraints / guardrails
- **Prometheus plans only**: execution will be done by `/start-work`.
- Prefer minimal changes aligned with existing patterns.
- Avoid introducing heavy dependencies.
- Keep Google OAuth code path intact but **disabled in UI** (commented/feature-flagged) so it can be restored easily.

### Test & verification posture
- Test infrastructure exists (API has tests under `api/src/**/__tests__/*` and route tests like `api/src/trpc/routes/users.test.ts`).
- Plan includes **tests-after** for the backend invite-by-email work (unit tests + route tests), and detailed **manual QA** steps for UI + game behavior.

### Metis note
Metis gap review was attempted but the Metis MCP server was not available in this environment. This plan includes an explicit “gap-check” task to compensate.

### Decisions (confirmed)
- **Invite-by-email: who can invite**: **Any authenticated user** can invite by email.
- **Maker gating**: **Block sending magic link** unless `email_invites` contains the email.
- **Portal animation**: Use **multi-frame PNG** animation via existing `animate` behavior (`frames: [url1, ...]`, `fps`, `loop: true`).

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| 1. Confirm trajectory line root cause + fix approach | None | Establish correct offset strategy before changing behavior.
| 2. Implement trajectory line fix | 1 | Needs confirmed fix direction (+90 vs -90, and whether to fix via offset vs visual rotation).
| 3. QC Slopeggle rules (manual + inspector) | 2 | Should verify after aim line fix (affects aiming UX).
| 4. Confirm how `animate` affects visuals | None | Determines whether portal animation is achievable purely via behavior or needs renderer changes.
| 5. Choose portal animation asset approach | 4 | Asset approach depends on how animation frames are consumed.
| 6. Add portal animation (assets + game definition wiring) | 5 | Needs a selected approach (multi-frame URLs vs sprite sheet).
| 7. Add Maker screen hero title image (Slopcade) | None | Pure UI change; independent of invite system.
| 8. Remove InviteCodeInput gating in Maker screen | None | Pure UI gating removal.
| 9. Comment out Google login UI in Maker screen | None | Pure UI change.
| 10. Design invite-by-email data model + routes (API) | None | Foundation for email-based invites.
| 11. Implement invite-by-email DB migration (schema) | 10 | Must implement chosen schema.
| 12. Implement invite-by-email API endpoints | 11 | Endpoints depend on DB tables.
| 13. Wire Maker login to invite-by-email check | 12 | UI gating depends on API behavior.
| 14. Update/extend user sync to record invite redemption | 12 | Needs invite tables + routes.
| 15. Add/adjust tests for invite-by-email system | 12, 14 | Tests target the implemented endpoints + side effects.
| 16. End-to-end verification sweep (Slopeggle + Maker login) | 2, 6, 7, 8, 9, 13, 14 | Final integrated verification.
| 17. Documentation note / lightweight dev note (optional) | 16 | Only after behavior is verified.

---

## Parallel Execution Graph

Wave 1 (Start immediately):
├── Task 1: Confirm trajectory line fix direction
├── Task 4: Confirm `animate` → visual integration
├── Task 7: Maker hero title image plan
├── Task 8: Remove InviteCodeInput gating plan
├── Task 9: Comment out Google login plan
└── Task 10: Invite-by-email system design (API + DB)

Wave 2 (After Wave 1):
├── Task 2: Implement trajectory line fix (depends: 1)
├── Task 5: Choose portal animation asset approach (depends: 4)
└── Task 11: DB migration for invite-by-email (depends: 10)

Wave 3 (After Wave 2):
├── Task 3: QC Slopeggle rules (depends: 2)
├── Task 6: Add portal animation wiring (depends: 5)
└── Task 12: Implement invite-by-email routes (depends: 11)

Wave 4 (After Wave 3):
├── Task 13: Wire Maker login to invite-by-email check (depends: 12)
├── Task 14: Record inviter→invitee relationship (depends: 12)
└── Task 15: Add tests (depends: 12, 14)

Wave 5 (After Wave 4):
└── Task 16: End-to-end verification sweep

Critical Path: Task 10 → 11 → 12 → 13 → 16
Estimated Parallel Speedup: ~35–45% vs fully sequential.

---

## Tasks

> For each task, include: what to do, exact files, acceptance criteria, and delegation guidance.

### Skill evaluation rubric (applies to every task)
To satisfy the “evaluate all skills” requirement without repeating identical text 17 times, each task includes:
- **Included skills** (if any)
- **Omitted skills** with short “not applicable” reasons.

The full set evaluated for each task:
`agent-browser`, `frontend-ui-ux`, `git-master`, `dev-browser`, `typescript-programmer`, `python-programmer`, `svelte-programmer`, `golang-tui-programmer`, `python-debugger`, `data-scientist`, `prompt-engineer`.

---

### Task 1: Confirm trajectory line root cause + fix direction

**Description**:
- Validate whether the 90° error is purely a **visual orientation issue** (rect tall along local Y, while angle=atan2(dy,dx) aligns local X) vs a deeper transform/render mismatch.
- Decide fix method:
  1) Change `RotateTowardBehavior.offset` for trajectoryLine (preferred minimal change), or
  2) Change the line visual to be wide-and-short (horizontal) so `atan2` aligns naturally, or
  3) Adjust renderer’s rect orientation conventions (avoid unless necessary).

**Files / references**:
- `app/lib/test-games/games/slopeggle/game.ts:361-374` (trajectoryLine template)
- `app/lib/game-engine/behaviors/MovementBehaviors.ts:96-135` (`rotate_toward`)

**Delegation Recommendation**:
- Category: `quick` — small, localized analysis.
- Skills: [`typescript-programmer`] — read TS behavior + game definition quickly.

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`: relevant TS-only investigation.
- ❌ OMITTED `agent-browser`: optional; not required for code-level cause.
- ❌ OMITTED `frontend-ui-ux`: not UI/visual design; it’s coordinate math.
- ❌ OMITTED `git-master`: no git work in analysis.
- ❌ OMITTED `dev-browser`: optional; can be used later in QC.
- ❌ OMITTED `python-programmer`: not Python.
- ❌ OMITTED `svelte-programmer`: not Svelte.
- ❌ OMITTED `golang-tui-programmer`: not Go TUI.
- ❌ OMITTED `python-debugger`: not Python.
- ❌ OMITTED `data-scientist`: no data processing.
- ❌ OMITTED `prompt-engineer`: not prompt/LLM work.

**Depends On**: None

**Acceptance Criteria**:
- A concrete decision written into the execution notes: one of {offset change, visual dimension change, renderer change}.
- If offset change: specify sign (+90 or -90) with rationale.

---

### Task 2: Implement trajectory line fix (90° correction)

**Description**:
- Apply the chosen fix from Task 1.
- Recommended minimal change: set `offset` on the trajectoryLine’s `rotate_toward` behavior.
  - Target file: `app/lib/test-games/games/slopeggle/game.ts`
  - Change: `behaviors: [{ type: "rotate_toward", target: "touch", speed: 200, offset: <±90> }]`
  - (If needed) also apply same offset to `cannon` template rotate_toward, but only if cannon visually shares the same 90° issue.

**Files / references**:
- `app/lib/test-games/games/slopeggle/game.ts:361-374` (trajectoryLine template)
- (optional) `app/lib/test-games/games/slopeggle/game.ts:170-176` (cannon template)

**Delegation Recommendation**:
- Category: `quick` — single-file change.
- Skills: [`typescript-programmer`] — safe TS edit.

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`: implement + keep TS types.
- ❌ OMITTED `agent-browser`: useful for verifying but not for editing.
- ❌ OMITTED `frontend-ui-ux`: not design-heavy.
- ❌ OMITTED `git-master`: executor can commit later in strategy.
- ❌ OMITTED `dev-browser`: verification later.
- ❌ OMITTED `python-programmer`: not Python.
- ❌ OMITTED `svelte-programmer`: not Svelte.
- ❌ OMITTED `golang-tui-programmer`: not Go.
- ❌ OMITTED `python-debugger`: not Python.
- ❌ OMITTED `data-scientist`: no.
- ❌ OMITTED `prompt-engineer`: no.

**Depends On**: Task 1

**Acceptance Criteria**:
- When aiming, the trajectory line visually aligns with the direction from cannon to cursor/touch (no 90° offset).
- Manual verification:
  - Start app (`pnpm dev`) and open Slopeggle test game.
  - Drag to aim in multiple quadrants; line should point at cursor.
- Optional evidence: screenshot saved by the executor to `.sisyphus/evidence/slopeggle-trajectory-fix.png`.

---

### Task 3: Slopeggle rules QC (ball reset, single ball, launch at cursor)

**Description**:
- Verify rules work as expected:
  - Drain collision destroys ball and respawns/handles lives correctly.
  - “Only one ball at a time” enforced via `entity_count` conditions.
  - Launch direction matches cursor/touch (toward_touch + rotate_toward).

**Files / references**:
- `app/lib/test-games/games/slopeggle/game.ts:483-510` (trajectory spawn + fire_ball gate)
- `app/lib/test-games/games/slopeggle/game.ts` (ball drain / respawn rules; locate around drain handling)

**Delegation Recommendation**:
- Category: `visual-engineering` — interactive game behavior validation.
- Skills: [`dev-browser`, `agent-browser`] — run the app and interact deterministically.

**Skills Evaluation**:
- ✅ INCLUDED `dev-browser`: persistent interactive session to test aiming/dragging.
- ✅ INCLUDED `agent-browser`: for scripted verification flows and screenshots.
- ❌ OMITTED `frontend-ui-ux`: not redesign.
- ❌ OMITTED `git-master`: not required for QA.
- ❌ OMITTED `typescript-programmer`: QA-only task.
- ❌ OMITTED `python-programmer`: no.
- ❌ OMITTED `svelte-programmer`: no.
- ❌ OMITTED `golang-tui-programmer`: no.
- ❌ OMITTED `python-debugger`: no.
- ❌ OMITTED `data-scientist`: no.
- ❌ OMITTED `prompt-engineer`: no.

**Depends On**: Task 2

**Acceptance Criteria**:
- Ball drain: ball disappears on hitting drain and a new ball becomes available according to the intended design (explicitly confirm: immediate respawn vs “wait to fire again”).
- Single ball: repeated fire actions do not create multiple balls while one exists.
- Launch: ball initial trajectory matches the aim direction.
- Evidence: 2–3 screenshots demonstrating each behavior (saved to `.sisyphus/evidence/`).

---

### Task 4: Confirm `animate` behavior actually changes rendered image

**Description**:
- Determine how `runtime.state.currentFrame` is used:
  - If visual system reads this value to override `visual.imageUrl`, portal animation can be implemented with frames list.
  - If not, implement the missing bridge (likely in `VisualBehaviors` or renderer layer) so `animate` can drive image URL.

**Files / references**:
- `app/lib/game-engine/behaviors/LifecycleBehaviors.ts:238-264` (`animate` handler)
- Likely targets to inspect:
  - `app/lib/game-engine/behaviors/VisualBehaviors.ts` (not yet referenced)
  - renderer integration where `visual.type === "image"` is drawn (Godot bridge / runtime renderer)

**Delegation Recommendation**:
- Category: `ultrabrain` — may require cross-layer reasoning (behavior → render).
- Skills: [`typescript-programmer`] — engine code analysis.

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`: required to trace runtime state usage.
- ❌ OMITTED `dev-browser`: optional; can be used to sanity-check animation quickly.
- ❌ OMITTED `agent-browser`: optional.
- ❌ OMITTED `frontend-ui-ux`: not about design.
- ❌ OMITTED `git-master`: later.
- ❌ OMITTED `python-programmer`: no.
- ❌ OMITTED `svelte-programmer`: no.
- ❌ OMITTED `golang-tui-programmer`: no.
- ❌ OMITTED `python-debugger`: no.
- ❌ OMITTED `data-scientist`: no.
- ❌ OMITTED `prompt-engineer`: no.

**Depends On**: None

**Acceptance Criteria**:
- Confirmed by user: `animate` works for sprite/frame animation.
- Still required for executors: locate the **exact** file/line where `runtime.state.currentFrame` is applied to the rendered image (or, if not found, expand scope to wire it through).

---

### Task 5: Choose portal animation asset approach

**Description**:
- Select an approach compatible with Task 4’s findings:
  1) **Multi-frame PNG URLs**: add `animate` behavior with `frames: [url1, url2, ...]`.
  2) **Sprite sheet**: only if engine supports slicing (verify first).
  3) **GIF**: only if renderer/Godot pipeline supports it reliably (verify first).

**Files / references**:
- `app/lib/test-games/games/slopeggle/game.ts:313-350` (portal templates)
- `api/scripts/game-configs/slopeggle/assets.config.ts` (existing assets config; add frames if needed)
- `api/src/ai/pipeline/types.ts` (available asset types)

**Delegation Recommendation**:
- Category: `unspecified-high` — product+tech tradeoff; affects pipeline.
- Skills: [`typescript-programmer`, `prompt-engineer`] — update asset config + frame generation prompts.

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`: for pipeline + config edits.
- ✅ INCLUDED `prompt-engineer`: helps craft consistent frame prompts (teleport portal animation).
- ❌ OMITTED `agent-browser`: not needed for decision.
- ❌ OMITTED `dev-browser`: optional.
- ❌ OMITTED `frontend-ui-ux`: aesthetics secondary; focus is feasibility.
- ❌ OMITTED `git-master`: not needed.
- ❌ OMITTED `python-programmer`: no.
- ❌ OMITTED `svelte-programmer`: no.
- ❌ OMITTED `golang-tui-programmer`: no.
- ❌ OMITTED `python-debugger`: no.
- ❌ OMITTED `data-scientist`: no.

**Depends On**: Task 4

**Acceptance Criteria**:
- One selected approach documented with:
  - File changes required
  - Asset list required (frame count, naming)
  - Verification method

---

### Task 6: Implement portal animation (assets + Slopeggle wiring)

**Description**:
- Update portal templates in `app/lib/test-games/games/slopeggle/game.ts` to animate.
- If using multi-frame URLs:
  - Add `behaviors: [{ type: "animate", frames: [..], fps: <n>, loop: true }, ...existing teleport...]`.
  - Keep teleport behavior unchanged.
- Create/generate required portal frame assets and ensure URLs exist.
  - If pipeline-backed: extend `api/scripts/game-configs/slopeggle/assets.config.ts` to add portal frame assets.

**Files / references**:
- `app/lib/test-games/games/slopeggle/game.ts:313-350` (portal templates)
- `app/lib/game-engine/behaviors/LifecycleBehaviors.ts:238-264` (`animate`)
- `api/scripts/game-configs/slopeggle/assets.config.ts` (add assets)
- `api/scripts/game-configs/index.ts` (already registers slopeggle)

**Delegation Recommendation**:
- Category: `visual-engineering` — visual correctness matters.
- Skills: [`typescript-programmer`, `dev-browser`] — implement + validate visually.

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`: game definition edits + asset config edits.
- ✅ INCLUDED `dev-browser`: validate animation and teleport behavior quickly.
- ❌ OMITTED `agent-browser`: optional, can be used for screenshots.
- ❌ OMITTED `frontend-ui-ux`: no redesign.
- ❌ OMITTED `git-master`: handled in commit strategy.
- ❌ OMITTED `python-programmer`: no.
- ❌ OMITTED `svelte-programmer`: no.
- ❌ OMITTED `golang-tui-programmer`: no.
- ❌ OMITTED `python-debugger`: no.
- ❌ OMITTED `data-scientist`: no.
- ❌ OMITTED `prompt-engineer`: optional once prompts set in Task 5.

**Depends On**: Task 5

**Acceptance Criteria**:
- Portals visibly animate (loop) with stable FPS.
- Teleport still works: ball entering portal A emerges from portal B with velocity preserved.
- Evidence: short screenshot sequence or video note (at least one screenshot) saved to `.sisyphus/evidence/slopeggle-portal-anim.png`.

---

### Task 7: Replace Maker login hero emoji with Slopcade hero title image

**Description**:
- Replace the large emoji at `maker.tsx` login screen with an image.
- Decide source of the image:
  - Preferred: generate a transparent hero via asset pipeline as `title_hero_no_bg` and host in R2.
  - Minimal alternative: use an existing hosted asset URL if already available.

**Files / references**:
- `app/app/(tabs)/maker.tsx:198-207` (login hero)
- Asset pipeline examples:
  - `api/scripts/game-configs/example-title-hero-no-bg.md`
  - `api/src/ai/pipeline/prompt-builder.ts` (title hero types)

**Delegation Recommendation**:
- Category: `visual-engineering` — UI polish.
- Skills: [`frontend-ui-ux`, `typescript-programmer`] — UI integration + styling.

**Skills Evaluation**:
- ✅ INCLUDED `frontend-ui-ux`: choose sizing/layout that looks good across platforms.
- ✅ INCLUDED `typescript-programmer`: implement RN image component changes safely.
- ❌ OMITTED `dev-browser`: optional.
- ❌ OMITTED `agent-browser`: optional.
- ❌ OMITTED `git-master`: later.
- ❌ OMITTED `python-programmer`: no.
- ❌ OMITTED `svelte-programmer`: no.
- ❌ OMITTED `golang-tui-programmer`: no.
- ❌ OMITTED `python-debugger`: no.
- ❌ OMITTED `data-scientist`: no.
- ❌ OMITTED `prompt-engineer`: only needed if generating new art; can be included if doing pipeline generation.

**Depends On**: None

**Acceptance Criteria**:
- Login screen shows a “Slopcade” hero title image instead of 🎮.
- Image renders on iOS + web without layout overflow.

---

### Task 8: Simplify Maker login UI to email-only (remove InviteCodeInput UI)

**Description**:
- Remove `InviteCodeInput` from `maker.tsx` and remove `validatedInviteCode` gating from the magic link button.
- Delete or stop importing `InviteCodeInput`.
- The screen should still communicate invite-only status, but without code entry.

**Files / references**:
- `app/app/(tabs)/maker.tsx`:
  - import at ~`21`
  - state `validatedInviteCode` at ~`43`
  - component usage at ~`209`
  - gating in button className/disabled at ~`254-260`
- `app/components/auth/InviteCodeInput.tsx` (will become unused; decide whether to keep for future or remove)

**Delegation Recommendation**:
- Category: `quick` — straightforward UI removal.
- Skills: [`typescript-programmer`] — TSX edit.

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`: TSX changes.
- ❌ OMITTED `frontend-ui-ux`: optional.
- ❌ OMITTED `dev-browser`: optional.
- ❌ OMITTED `agent-browser`: optional.
- ❌ OMITTED `git-master`: later.
- ❌ OMITTED `python-programmer`: no.
- ❌ OMITTED `svelte-programmer`: no.
- ❌ OMITTED `golang-tui-programmer`: no.
- ❌ OMITTED `python-debugger`: no.
- ❌ OMITTED `data-scientist`: no.
- ❌ OMITTED `prompt-engineer`: no.

**Depends On**: None

**Acceptance Criteria**:
- Maker login screen no longer shows InviteCodeInput.
- “Send Magic Link” button is enabled based only on email validity + loading state.

---

### Task 9: Comment out Google login in Maker screen

**Description**:
- Remove or comment out the “Continue with Google” button block from `maker.tsx` login UI.
- Keep `useAuth().signInWithGoogle` implementation intact for later.
- Ensure there are no unused imports/variables (or switch to lazy/conditional).

**Files / references**:
- `app/app/(tabs)/maker.tsx:161-172` (handleGoogleSignIn)
- `app/app/(tabs)/maker.tsx:267-284` (Google button)
- `app/hooks/useAuth.ts` (keeps `signInWithGoogle` exported)

**Delegation Recommendation**:
- Category: `quick` — simple UI change.
- Skills: [`typescript-programmer`] — TSX edit.

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`: TSX changes.
- ❌ OMITTED `frontend-ui-ux`: optional.
- ❌ OMITTED `dev-browser`: optional.
- ❌ OMITTED `agent-browser`: optional.
- ❌ OMITTED `git-master`: later.
- ❌ OMITTED `python-programmer`: no.
- ❌ OMITTED `svelte-programmer`: no.
- ❌ OMITTED `golang-tui-programmer`: no.
- ❌ OMITTED `python-debugger`: no.
- ❌ OMITTED `data-scientist`: no.
- ❌ OMITTED `prompt-engineer`: no.

**Depends On**: None

**Acceptance Criteria**:
- No Google login button visible.
- No TS/ESLint “unused” warnings introduced (verified by `pnpm tsc --noEmit`).

---

### Task 10: Design invite-by-email system (data model + API surfaces)

**Description**:
- Define the minimum viable invite-by-email system:
  - Allowlist/gating: only invited emails can request magic link.
  - Track inviter (user id) → invitee email.
  - Mark invites redeemed when that email successfully authenticates.

**Proposed D1 schema (subject to confirmation)**:
- New table: `email_invites`
  - `id TEXT PRIMARY KEY`
  - `inviter_user_id TEXT REFERENCES users(id)` (nullable for admin-seeded invites)
  - `invitee_email TEXT NOT NULL` (normalized lowercase)
  - `status TEXT NOT NULL` (`sent` | `redeemed` | `revoked`)
  - `redeemed_user_id TEXT REFERENCES users(id)`
  - timestamps (`created_at`, `updated_at`, `redeemed_at`)
  - `UNIQUE(invitee_email)` (one active invite per email)

**API surface (tRPC)**:
- Public:
  - `invites.isEmailInvited({ email }) -> { invited: boolean, status?: string }`
- Protected:
  - `invites.create({ email })` (creates invite with inviter_user_id = ctx.user.id)
  - `invites.revoke({ email })` (optional)
  - `invites.myInvites()` (optional)
- Internal/protected:
  - `invites.redeemForCurrentUser()` invoked after auth sync.

**Files / references**:
- `api/schema.sql` (add new table near signup code section or user section)
- `api/src/trpc/routes/users.ts` (pattern for protectedProcedure + D1 writes)
- Existing route structure: `api/src/trpc/routes/economy.ts`

**Delegation Recommendation**:
- Category: `ultrabrain` — involves product semantics + security.
- Skills: [`typescript-programmer`] — tRPC + D1 patterns.

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`: design must align with existing TS schemas/routes.
- ❌ OMITTED `git-master`: not needed.
- ❌ OMITTED `agent-browser`: not needed.
- ❌ OMITTED `dev-browser`: not needed.
- ❌ OMITTED `frontend-ui-ux`: not UI.
- ❌ OMITTED `python-programmer`: no.
- ❌ OMITTED `svelte-programmer`: no.
- ❌ OMITTED `golang-tui-programmer`: no.
- ❌ OMITTED `python-debugger`: no.
- ❌ OMITTED `data-scientist`: no.
- ❌ OMITTED `prompt-engineer`: no.

**Depends On**: None

**Acceptance Criteria**:
- A written “spec” committed in the PR description or in code comments:
  - Normalization rules for email
  - Who is authorized to create invites (**any authenticated user**)
  - How redemption is recorded
  - Edge cases (re-invite, email case changes)

---

### Task 11: Implement invite-by-email DB migration (D1 schema + shared schema)

**Description**:
- Add `email_invites` table to D1 schema.
- Add corresponding typed schema to `shared/src/schema/*` if the project uses Drizzle schema there for type safety (pattern: `shared/src/schema/economy.ts`).

**Files / references**:
- `api/schema.sql` (add `CREATE TABLE IF NOT EXISTS email_invites (...)`)
- `shared/src/schema/economy.ts` (or create `shared/src/schema/invites.ts` if preferred; keep consistent with project conventions)

**Delegation Recommendation**:
- Category: `unspecified-high` — schema impacts multiple layers.
- Skills: [`typescript-programmer`] — schema updates.

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`: schema + types.
- ❌ OMITTED `git-master`: no.
- ❌ OMITTED `agent-browser`: no.
- ❌ OMITTED `dev-browser`: no.
- ❌ OMITTED `frontend-ui-ux`: no.
- ❌ OMITTED `python-programmer`: no.
- ❌ OMITTED `svelte-programmer`: no.
- ❌ OMITTED `golang-tui-programmer`: no.
- ❌ OMITTED `python-debugger`: no.
- ❌ OMITTED `data-scientist`: no.
- ❌ OMITTED `prompt-engineer`: no.

**Depends On**: Task 10

**Acceptance Criteria**:
- DB migration command succeeds:
  - `pnpm --filter @slopcade/api db:push` → success
- Typecheck:
  - `pnpm tsc --noEmit` → success

---

### Task 12: Implement invite-by-email API endpoints (tRPC)

**Description**:
- Create a new router (recommended) `api/src/trpc/routes/invites.ts` (or extend `users.ts` if you prefer fewer files).
- Add procedures described in Task 10.
- Ensure protected routes enforce authorization:
  - For MVP: any authenticated user can invite (or restrict to admins; see decision below).

**Files / references**:
- `api/src/trpc/routes/users.ts` (pattern)
- `api/src/trpc/routes/economy.ts` (publicProcedure pattern)
- `api/src/trpc/index` / router registration (locate where routers are combined; update accordingly)

**Delegation Recommendation**:
- Category: `ultrabrain` — correctness + security.
- Skills: [`typescript-programmer`] — tRPC + D1.

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`: core implementation.
- ❌ OMITTED `git-master`: no.
- ❌ OMITTED `agent-browser`: no.
- ❌ OMITTED `dev-browser`: no.
- ❌ OMITTED `frontend-ui-ux`: no.
- ❌ OMITTED `python-programmer`: no.
- ❌ OMITTED `svelte-programmer`: no.
- ❌ OMITTED `golang-tui-programmer`: no.
- ❌ OMITTED `python-debugger`: no.
- ❌ OMITTED `data-scientist`: no.
- ❌ OMITTED `prompt-engineer`: no.

**Depends On**: Task 11

**Acceptance Criteria**:
- Manual API verification (local):
  - `pnpm dev` (API running)
  - Use a quick script or tRPC client call to:
    - create invite
    - check isEmailInvited
    - redeem (via calling redeem route or via sync)
- No PII leakage in public route: public response should be boolean + minimal metadata.

---

### Task 13: Wire Maker login to invite-by-email gating

**Description**:
- Before calling `sendMagicLink(email)`, check `invites.isEmailInvited({ email })`.
- If not invited, **do not send** the magic link, and show a friendly invite-only message.
- Remove old “enter invite code” copy and replace with “invite-only” + contact instructions.

**Files / references**:
- `app/app/(tabs)/maker.tsx` (`handleMagicLink` at ~`174-192`)
- `app/lib/trpc/react` usage patterns

**Delegation Recommendation**:
- Category: `visual-engineering` — user-facing auth UX.
- Skills: [`frontend-ui-ux`, `typescript-programmer`] — UX + TSX.

**Skills Evaluation**:
- ✅ INCLUDED `frontend-ui-ux`: ensure message + flow is clear.
- ✅ INCLUDED `typescript-programmer`: implement query/mutation and state.
- ❌ OMITTED `dev-browser`: optional.
- ❌ OMITTED `agent-browser`: optional.
- ❌ OMITTED `git-master`: later.
- ❌ OMITTED `python-programmer`: no.
- ❌ OMITTED `svelte-programmer`: no.
- ❌ OMITTED `golang-tui-programmer`: no.
- ❌ OMITTED `python-debugger`: no.
- ❌ OMITTED `data-scientist`: no.
- ❌ OMITTED `prompt-engineer`: no.

**Depends On**: Task 12

**Acceptance Criteria**:
- Entering an uninvited email:
  - Magic link is **not** sent.
  - UI shows invite-only message.
- Entering an invited email:
  - Magic link send proceeds.
  - “Check your email!” success message still appears.

---

### Task 14: Record inviter → invitee relationship on successful login

**Description**:
- On auth sync (`trpc.users.syncFromAuth`) or immediately after, mark invite as redeemed:
  - Find `email_invites` row by `invitee_email = ctx.user.email`.
  - Set `status = redeemed`, `redeemed_user_id = ctx.user.id`, `redeemed_at = now`.
- Ensure idempotency (multiple sync calls should not error).

**Files / references**:
- `app/hooks/useAuth.ts:26-32` (`syncUserToDatabase`)
- `api/src/trpc/routes/users.ts:15-36` (syncFromAuth)

**Delegation Recommendation**:
- Category: `unspecified-high` — correctness + data integrity.
- Skills: [`typescript-programmer`] — D1 updates + route logic.

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`: implement idempotent update.
- ❌ OMITTED `frontend-ui-ux`: no.
- ❌ OMITTED `dev-browser`: no.
- ❌ OMITTED `agent-browser`: no.
- ❌ OMITTED `git-master`: later.
- ❌ OMITTED `python-programmer`: no.
- ❌ OMITTED `svelte-programmer`: no.
- ❌ OMITTED `golang-tui-programmer`: no.
- ❌ OMITTED `python-debugger`: no.
- ❌ OMITTED `data-scientist`: no.
- ❌ OMITTED `prompt-engineer`: no.

**Depends On**: Task 12

**Acceptance Criteria**:
- After signing in with an invited email and syncing:
  - `email_invites.status` becomes `redeemed`.
  - `redeemed_user_id` is populated.
- Re-running sync does not create duplicates or throw.

---

### Task 15: Add tests for invite-by-email (backend)

**Description**:
- Add unit/route tests similar to existing patterns:
  - Reference existing test style in `api/src/trpc/routes/users.test.ts`.
- Tests should cover:
  - `isEmailInvited` returns false for unknown
  - invite creation works (protected)
  - redeem is idempotent
  - redemption correctly links inviter + invitee

**Files / references**:
- `api/src/trpc/routes/users.test.ts` (test harness patterns)
- `api/src/__fixtures__/test-utils.ts` (contains D1 schema fixtures for signup codes; extend as needed)

**Delegation Recommendation**:
- Category: `unspecified-high` — careful test writing.
- Skills: [`typescript-programmer`] — tests in TS.

**Skills Evaluation**:
- ✅ INCLUDED `typescript-programmer`: test implementation.
- ❌ OMITTED `git-master`: no.
- ❌ OMITTED `agent-browser`: no.
- ❌ OMITTED `dev-browser`: no.
- ❌ OMITTED `frontend-ui-ux`: no.
- ❌ OMITTED `python-programmer`: no.
- ❌ OMITTED `svelte-programmer`: no.
- ❌ OMITTED `golang-tui-programmer`: no.
- ❌ OMITTED `python-debugger`: no.
- ❌ OMITTED `data-scientist`: no.
- ❌ OMITTED `prompt-engineer`: no.

**Depends On**: Tasks 12, 14

**Acceptance Criteria**:
- `pnpm test` (or the project’s API test command) passes for all new/updated tests.
- Tests are deterministic and do not require network.

---

### Task 16: End-to-end verification sweep (Slopeggle + Maker)

**Description**:
- Verify both scopes together in one pass:
  - Slopeggle: aim line, portal animation, ball lifecycle.
  - Maker: Slopcade hero image, email-only flow, invite-by-email gating, no Google UI.

**Files / references**:
- Slopeggle: `app/lib/test-games/games/slopeggle/game.ts`
- Maker: `app/app/(tabs)/maker.tsx`
- Auth: `app/hooks/useAuth.ts`

**Delegation Recommendation**:
- Category: `visual-engineering` — interactive app QA.
- Skills: [`dev-browser`, `agent-browser`] — run flows + capture evidence.

**Skills Evaluation**:
- ✅ INCLUDED `dev-browser`: persistent interactive QA.
- ✅ INCLUDED `agent-browser`: automation + screenshots.
- ❌ OMITTED `frontend-ui-ux`: not redesign.
- ❌ OMITTED `git-master`: no.
- ❌ OMITTED `typescript-programmer`: QA-only.
- ❌ OMITTED `python-programmer`: no.
- ❌ OMITTED `svelte-programmer`: no.
- ❌ OMITTED `golang-tui-programmer`: no.
- ❌ OMITTED `python-debugger`: no.
- ❌ OMITTED `data-scientist`: no.
- ❌ OMITTED `prompt-engineer`: no.

**Depends On**: Tasks 2, 6, 7, 8, 9, 13, 14

**Acceptance Criteria**:
- `pnpm tsc --noEmit` passes.
- Manual checks:
  - Slopeggle: aim line correct; portals animate; teleport works; drain + single-ball rules correct.
  - Maker: uninvited email blocked; invited email can receive magic link; Google button absent.
- Evidence: screenshots placed in `.sisyphus/evidence/`.

---

### Task 17: Optional: document invite-by-email + slopeggle behaviors (short dev note)

**Description**:
- Add a short internal doc or update an existing one describing:
  - Invite-by-email behavior (where enforced, tables, routes)
  - Slopeggle-specific animation/aiming conventions (offset rationale)

**Files / references**:
- Candidate docs location: `docs/shared/` or `docs/game-maker/` depending on where auth docs live.

**Delegation Recommendation**:
- Category: `writing` — concise documentation.
- Skills: [`prompt-engineer`] — ensure clarity and terseness.

**Skills Evaluation**:
- ✅ INCLUDED `prompt-engineer`: improves clarity/structure.
- ❌ OMITTED `typescript-programmer`: not required.
- ❌ OMITTED `frontend-ui-ux`: no.
- ❌ OMITTED `git-master`: no.
- ❌ OMITTED `dev-browser`: no.
- ❌ OMITTED `agent-browser`: no.
- ❌ OMITTED `python-programmer`: no.
- ❌ OMITTED `svelte-programmer`: no.
- ❌ OMITTED `golang-tui-programmer`: no.
- ❌ OMITTED `python-debugger`: no.
- ❌ OMITTED `data-scientist`: no.

**Depends On**: Task 16

**Acceptance Criteria**:
- Doc exists and is linked from an appropriate `INDEX.md` if required by the docs system.

---

## Commit Strategy

> Use conventional commits; keep commits reasonably atomic.

1. `fix(slopeggle): correct trajectory line rotation offset`
   - Files: `app/lib/test-games/games/slopeggle/game.ts`
   - Verify: run Slopeggle and confirm aim line.

2. `feat(slopeggle): add portal animation frames`
   - Files: `api/scripts/game-configs/slopeggle/assets.config.ts` (if assets changed), `app/lib/test-games/games/slopeggle/game.ts`
   - Verify: portal animation visible + teleport works.

3. `ui(maker): switch to email-only login + remove google button`
   - Files: `app/app/(tabs)/maker.tsx`, possibly remove unused `InviteCodeInput` usage.
   - Verify: tsc + manual login screen.

4. `feat(auth): invite-by-email gating + redemption tracking`
   - Files: `api/schema.sql`, `api/src/trpc/routes/*`, `app/app/(tabs)/maker.tsx`, `api/src/**/__tests__/*`
   - Verify: tests + manual invite flow.

## Success Criteria

- Slopeggle:
  - Trajectory line points at cursor/touch (no 90° mismatch).
  - Portals animate and teleport remains correct.
  - Rules: drain/respawn semantics confirmed; single ball enforced.

- Game Maker:
  - Login screen uses Slopcade title hero image.
  - Email-only login; no invite code UI.
  - Google login hidden.
  - Invite-by-email enforced before sending magic link.
  - DB tracks inviter→invitee and redemption is recorded.

- Engineering:
  - `pnpm tsc --noEmit` passes.
  - Backend tests for invite-by-email pass.
