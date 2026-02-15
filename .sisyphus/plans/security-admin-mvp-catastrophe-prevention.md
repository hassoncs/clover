# Security/Admin MVP Catastrophe-Prevention Plan

## TL;DR

> **Quick Summary**: Ship a minimum hardening slice that blocks the fastest abuse paths before launch: prompt abuse, billing bypass confidence gaps, and missing operational visibility.
>
> **Deliverables**:
> - User-facing AI prompt moderation guard (cheap/weak by design, but effective for obvious abuse)
> - Endpoint-by-endpoint billing enforcement verification with fixes where needed
> - Minimal centralized audit events for sensitive/admin actions
> - Cloudflare anomaly alerts + runbook
> - Tiny admin-only security dashboard (abuse metrics, user count, spend charts)
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 -> Task 2 -> Task 5 -> Task 7

---

## Context

### Original Request
Create an official plan for remaining security/admin backlog tasks with MVP focus: what is required to prevent catastrophes before launch.

### Interview Summary
**Key Decisions**:
- Keep invite flow open to authenticated users creating invites; enforce invite-only access with `REQUIRE_INVITE=true`.
- Admin access remains hard-gated via `ADMIN_EMAILS` secret list.
- Prioritize catastrophe prevention over full trust-and-safety platform.

**Research Findings**:
- Billing primitives are already strong (`wallet-service`, transaction ledger), but verification coverage must be explicit.
- True pre-launch gap is missing prompt moderation at user-facing AI ingress points.
- Monitoring/audit centralization is important but can be thin at MVP.

### Metis Review (Addressed)
- Added explicit scope lock to avoid overbuilding moderation/audit UI.
- Added exact AI ingress list to avoid missed endpoints.
- Added concrete acceptance checks (commands + expected outcomes).

---

## Work Objectives

### Core Objective
Prevent pre-launch catastrophic abuse/cost incidents by introducing minimal controls at AI ingress, proving billing enforcement, and creating operational visibility for incidents.

### Concrete Deliverables
- `ModerationService` (keyword/regex pre-filter) integrated into user-facing AI entrypoints.
- Billing enforcement audit matrix for every user-facing AI-cost endpoint.
- `audit_events` storage + helper wired to admin/sensitive flows.
- Cloudflare alert rules + incident runbook.
- Admin-only dashboard route with core platform risk metrics.

### Definition of Done
- [ ] All user-facing AI ingress endpoints reject blocked prompt set with deterministic error.
- [ ] Billing verification matrix passes for all AI-cost endpoints.
- [ ] Admin/sensitive actions emit audit records.
- [ ] Alerting catches error-rate spike and generation-velocity anomaly.

### Must Have
- Prompt moderation before external AI calls.
- No endpoint that incurs AI cost without authenticated + billable flow.
- Auditable trail for admin/sensitive actions.

### Must NOT Have (Guardrails)
- No ML moderation provider integration in MVP phase.
- No moderation review dashboard/UI.
- No broad RBAC redesign.
- No CAPTCHA/IP reputation project in this plan.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> All task verification is agent-executed with commands/tooling only.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after (targeted route/service tests)
- **Framework**: Vitest / existing tRPC route tests

### Agent-Executed QA Scenarios (applies to every task)

Scenario: Blocked prompt is rejected before generation
  Tool: Bash (curl)
  Preconditions: API running, valid user token
  Steps:
    1. POST `games.generate` with blocked keyword payload
    2. Assert HTTP/trpc error code `BAD_REQUEST`
    3. Assert response message contains policy violation text
  Expected Result: Generation does not execute, user receives deterministic rejection
  Evidence: Saved response body JSON

Scenario: Allowed prompt still generates
  Tool: Bash (curl)
  Preconditions: API running, valid user with sufficient balance
  Steps:
    1. POST `games.generate` with clean prompt
    2. Assert success response shape includes generation result fields
  Expected Result: Normal generation path preserved
  Evidence: Saved response body JSON

Scenario: Billing guard blocks insufficient balance
  Tool: Bash (curl + SQL check helper)
  Preconditions: test user balance below required cost
  Steps:
    1. Call target AI-cost endpoint
    2. Assert precondition failure / insufficient balance error
    3. Assert no downstream generation job created
  Expected Result: No cost-incurring operation starts without funds
  Evidence: API error response + DB query output

Scenario: Audit event written for admin action
  Tool: Bash (curl + SQL query)
  Preconditions: admin token available
  Steps:
    1. Invoke admin endpoint (e.g. `adminTools.generateSound` in test-safe mode)
    2. Query `audit_events` by actor/action/time window
    3. Assert event exists with actor_id, action, target metadata
  Expected Result: Sensitive action is traceable
  Evidence: SQL result snapshot

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately)
├── Task 1: AI ingress inventory + moderation policy baseline
└── Task 3: Audit event schema + helper scaffolding

Wave 2 (After Wave 1)
├── Task 2: Integrate moderation at ingress points
├── Task 4: Billing verification matrix + remediation
└── Task 6: Cloudflare alert config/runbook draft

Wave 3 (After Wave 2)
└── Task 5: Final security gate checks + launch signoff

Wave 4 (After Wave 3)
└── Task 7: Admin-only observability dashboard

Critical Path: 1 -> 2 -> 5 -> 7

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|---|---|---|---|
| 1 | None | 2,4 | 3 |
| 2 | 1 | 5 | 4,6 |
| 3 | None | 5 | 1 |
| 4 | 1 | 5 | 2,6 |
| 5 | 2,3,4,6 | None | None |
| 6 | None | 5 | 2,4 |
| 7 | 5 | None | None |

---

## TODOs

- [x] 1. Lock user-facing AI ingress map and moderation policy

  **What to do**:
  - Confirm exact user-facing ingress points:
    - `api/src/trpc/routes/games.ts` (`generate`, `refine`)
    - `api/src/trpc/routes/chat-threads.ts` / `api/src/chat/stream-handler.ts`
    - `api/src/trpc/routes/asset-system/generation-jobs.ts`
  - Define MVP blocked categories + keyword/regex list (small, explicit, versioned).

  **Must NOT do**:
  - Add third-party moderation API in this phase.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `agent-orchestration`, `ai-sdk-usage`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 3)
  - **Blocks**: 2, 4
  - **Blocked By**: None

  **References**:
  - `api/src/trpc/routes/games.ts` - primary text-based generation/refinement entrypoints.
  - `api/src/chat/chat-handler.ts` - chat message to LLM flow and billing hook.
  - `api/src/chat/stream-handler.ts` - streaming generation path.
  - `api/src/trpc/routes/asset-system/generation-jobs.ts` - asset generation prompt flow.

  **Acceptance Criteria**:
  - [ ] Ingress inventory file/checklist committed in plan notes.
  - [ ] Explicit blocked list documented with rationale.

- [x] 2. Implement MVP prompt moderation pre-filter at ingress

  **What to do**:
  - Add `ModerationService` (keyword/regex denylist) with deterministic error response.
  - Invoke filter before provider calls on all user-facing AI ingress points from Task 1.
  - Emit moderation rejection event (hashed prompt + reason code).

  **Must NOT do**:
  - Store full blocked prompt plaintext in logs.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `ai-sdk-usage`, `testing-patterns`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 5
  - **Blocked By**: 1

  **References**:
  - `api/src/trpc/routes/games.ts` - call sites for generate/refine.
  - `api/src/chat/chat-handler.ts` - chat pipeline entry and error handling patterns.
  - `api/src/trpc/routes/asset-system/generation-jobs.ts` - prompt composition path.

  **Acceptance Criteria**:
  - [ ] Blocked prompt test returns `BAD_REQUEST` and does not execute generation.
  - [ ] Allowed prompt test still succeeds.
  - [ ] Rejection event recorded with hash + reason.

- [x] 3. Add centralized audit events for sensitive/admin actions

  **What to do**:
  - Add migration for `audit_events` table.
  - Add audit helper/service and integrate into:
    - admin routes (`admin`, `adminTools`)
    - invite/admin-sensitive updates
    - moderation rejection logging path

  **Must NOT do**:
  - Build admin UI in this phase.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `storage-ops`, `testing-patterns`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 / finishes in Wave 2
  - **Blocks**: 5
  - **Blocked By**: None

  **References**:
  - `api/src/trpc/routes/admin-tools.ts` - high-impact admin actions.
  - `api/src/trpc/routes/admin.ts` - maintenance action surface.
  - `api/src/economy/wallet-service.ts` - existing transaction logging patterns.

  **Acceptance Criteria**:
  - [ ] Audit table migration applied.
  - [ ] Admin action writes one audit row with actor/action metadata.

- [x] 4. Complete endpoint-by-endpoint billing enforcement audit + fixes

  **What to do**:
  - Build matrix for each user-facing AI-cost endpoint: auth check, balance check, debit timing, refund behavior.
  - Patch any missing preconditions to ensure no cost-incurring work starts without billable authorization.

  **Must NOT do**:
  - Introduce new pricing model.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `economy-iap`, `testing-patterns`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 5
  - **Blocked By**: 1

  **References**:
  - `api/src/economy/wallet-service.ts` - canonical debit/credit semantics.
  - `api/src/trpc/routes/economy.ts` - rate-limit and authorization patterns.
  - `api/src/chat/chat-handler.ts` - token-based chat billing.
  - `api/src/trpc/routes/asset-system/generation-jobs.ts` - generation debits/refunds.

  **Acceptance Criteria**:
  - [ ] Matrix produced and attached to task notes.
  - [ ] For each endpoint, insufficient-balance test blocks operation.
  - [ ] For each endpoint, successful operation records expected ledger entries.

- [x] 5. Run MVP catastrophe-prevention launch gate

  **What to do**:
  - Execute consolidated security smoke suite:
    - moderation blocked/allowed
    - billing guards
    - admin gate
    - invite-only enforcement
    - audit event emission
  - Produce signed-off checklist for release decision.

  **Must NOT do**:
  - Expand scope beyond gate checks.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `testing-patterns`, `auth-system`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: 2,3,4,6

  **References**:
  - `.sisyphus/plans/pre-launch-security-review.md` - baseline and prior findings.
  - `api/src/trpc/index.ts` - auth/admin middleware expected behavior.
  - `api/src/trpc/routes/users.ts` - invite enforcement sync path.

  **Acceptance Criteria**:
  - [ ] All gate checks pass with captured evidence.
  - [ ] Go/no-go summary written.

- [x] 6. Configure Cloudflare anomaly alerts + incident runbook

  **What to do**:
  - Configure alerts for: API error spike, generation velocity spike, billing anomaly rate.
  - Write runbook with thresholds, responders, and first 30-minute triage steps.

  **Must NOT do**:
  - Build custom alerting platform.

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `storage-ops`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 5
  - **Blocked By**: None

  **References**:
  - `.sisyphus/plans/pre-launch-security-review.md` - proposed anomaly list.
  - Cloudflare Worker analytics/logging configuration in `api/wrangler.toml`.

  **Acceptance Criteria**:
  - [ ] Alert definitions exist and are test-triggered.
  - [ ] Runbook includes escalation contacts and rollback levers.

- [x] 7. Add tiny admin-only platform security dashboard

  **What to do**:
- Add admin-only route/page that surfaces:
    - total users (daily + cumulative)
    - recent spend (24h/7d from transactions)
    - moderation rejects (count by reason)
    - generation velocity/error trend (from audit/alerts data)
  - Add simple charts/cards (lightweight, no advanced BI stack).
  - Implement as app-integrated, Metro-compatible **web-only** admin route/screen.
  - Enforce admin auth gate on route access.

  **Must NOT do**:
  - Build generic analytics suite or role-management UI.
  - Build native mobile dashboard support in this MVP phase.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`, `auth-system`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: 5

  **References**:
  - `api/src/trpc/routes/admin.ts` - existing admin route patterns.
  - `api/src/trpc/routes/admin-tools.ts` - admin authorization precedent.
  - `api/src/economy/wallet-service.ts` - spend/transaction source fields.
  - `api/src/trpc/routes/moderation.ts` - moderation event semantics.

  **Acceptance Criteria**:
  - [ ] Non-admin user receives forbidden response on dashboard API/route.
  - [ ] Admin sees user count, spend cards, moderation reject counts, and trend chart.
  - [ ] Dashboard route renders on web build and is excluded/hidden on mobile flows.
  - [ ] Dashboard loads within acceptable dev performance (<2s on local data set).

---

## Commit Strategy

| After Task | Message | Verification |
|---|---|---|
| 2 | `feat(security): add mvp prompt moderation guard` | targeted route tests + curl checks |
| 3 | `feat(audit): add centralized audit events logging` | migration + query checks |
| 4 | `chore(billing): complete ai endpoint billing enforcement audit` | matrix + endpoint checks |
| 6 | `docs(ops): add cloudflare alert runbook` | runbook lint/check |
| 7 | `feat(admin): add minimal security observability dashboard` | admin/non-admin access + metric checks |

---

## Success Criteria

### Verification Commands
```bash
# Example verification bundle (executor fills exact scripts)
pnpm --filter api test
pnpm --filter api tsc --noEmit
```

### Final Checklist
- [ ] All Must Have controls implemented.
- [ ] All Must NOT Have constraints respected.
- [ ] Moderation blocks obvious abuse prompts at all user-facing AI ingress.
- [ ] Billing enforcement verified for every AI-cost endpoint.
- [ ] Audit trail exists for sensitive/admin actions.
- [ ] Monitoring alerts and runbook ready for launch operations.
- [ ] Admin-only dashboard provides minimum abuse/spend/user visibility.
