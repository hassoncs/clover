## 2026-02-15 Phase E Test Planning

### Test Infrastructure
- Tests use `cloudflare:test` with real D1 (not mocks) — see `api/src/__fixtures__/test-utils.ts`
- `initTestDatabase()` runs `schema.sql` to set up tables
- `createTestUser()`, `setupWalletBalance()` for test data
- `createAuthenticatedCaller()` for tRPC route testing
- Existing pattern: `env.DB` from `cloudflare:test` for direct DB access

### Billing Code Structure
- `api/src/billing/stripe-service.ts` — Stripe API wrapper (needs mocking for tests)
- `api/src/billing/entitlement-service.ts` — Pro entitlement resolver (D1 only, testable)
- `api/src/billing/stipend-service.ts` — Monthly stipend credit (D1 + WalletService, testable)
- `api/src/billing/subscription-tiers.ts` — Tier limits (pure functions, trivially testable)
- `api/src/billing/party-hosting-guard.ts` — Hosting limit check (D1, testable)
- `api/src/routes/webhooks/stripe.ts` — Webhook handler (Hono route, needs Stripe event mocking)
- `api/src/trpc/routes/billing.ts` — tRPC routes (needs Stripe service mocking)

### Key Constants
- `STIPEND_MAX_MICROS = 10_000_000` (10 Sparks)
- `STIPEND_CEILING_MICROS = 15_000_000` (15 Sparks)
- Stipend formula: `grant = min(10M, max(0, 15M - currentBalance))`

## 2026-02-15 Billing Service Test Implementation

### Schema/Test Environment Gotcha
- `initTestDatabase()` currently loads `schema.sql` that does not include the newer Stripe/entitlement tables and columns from `20260215_*` migrations
- Billing tests must bootstrap missing structures in `beforeAll` (`users` entitlement columns, `stripe_subscriptions`, `stripe_webhook_events`, `party_hosting_sessions`)
- `credit_transactions` in `schema.sql` may miss `'subscription_stipend'` in its type CHECK; tests that exercise `StipendService` need to reconcile this in test setup to avoid constraint failures

## 2026-02-16 Org Billing + Entitlement Extension

### Implementation Patterns
- Added `api/src/billing/org-subscription-tiers.ts` as the single source of truth for church org plans (`amen_church_small|medium|large`) with attendance and monthly/yearly pricing metadata.
- Added `OrgEntitlementService` in `api/src/billing/org-entitlement-service.ts` to resolve org-backed pro access from `organization_members` + `organizations` + `org_subscriptions` with status filter `('active', 'trialing')` and strict brand scoping.
- Extended `EntitlementService` to support source `'org'` and fallback behavior: individual active entitlement wins; org entitlement is used only when individual entitlement is inactive.
- Added org billing procedures in `api/src/trpc/routes/billing.ts`: `createOrgCheckoutSession`, `getOrgSubscriptionStatus`, and `createOrgPortalSession` with role checks (member/admin) and brand-scoped org queries.
- Stripe checkout for org billing uses `mode='subscription'` with dynamic `price_data` from org plan metadata and checkout metadata `{ orgId, brandId, planId }` for webhook reconciliation.

## 2026-02-16 Org Stripe Webhook Processing

### Webhook Handling Pattern
- Added `OrgWebhookHandler` (`api/src/billing/org-webhook-handler.ts`) as a dedicated Stripe-event handler for org subscriptions.
- `checkout.session.completed` uses metadata `{orgId, brandId, planId}` and `session.subscription` to upsert `org_subscriptions`, then promotes `organizations.status` from `trial` to `active`.
- `customer.subscription.updated` updates `status`, `current_period_start`, `current_period_end`, and `cancel_at_period_end` by `stripe_subscription_id`.
- `customer.subscription.deleted` marks org subscription as `cancelled` and sets `cancel_at_period_end = 1`.
- `invoice.payment_failed` marks org subscription as `past_due` by matching `stripe_customer_id`.
- Stripe status normalization is required before D1 writes because Stripe has states outside the DB check constraint (`unpaid`, `incomplete_expired`, etc.).
