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
