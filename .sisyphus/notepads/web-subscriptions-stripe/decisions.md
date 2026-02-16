## 2026-02-15 Phase E Test Strategy

### Decision: Unit test billing services directly, not through webhook handler
- EntitlementService, StipendService, PartyHostingGuard are all D1-backed and testable with cloudflare:test
- Webhook handler tests would require mocking Stripe signature verification — complex and brittle
- Focus on testing the business logic (entitlement resolution, stipend calculation, lifecycle state transitions)
- Webhook idempotency can be tested via direct D1 inserts to stripe_webhook_events

### Decision: Group tests by plan task, not by file
- Each Phase E checkbox maps to a test describe block
- This makes it easy to verify each acceptance criterion

## 2026-02-16 Org Webhook Endpoint Integration

### Decision: Implement org Stripe webhook as a tRPC publicProcedure in billing router
- Added `billing.stripeOrgWebhook` in `api/src/trpc/routes/billing.ts` to verify Stripe signature and dispatch to `OrgWebhookHandler`.
- Captured raw request body in `createContext` (only for `/trpc/billing.stripeOrgWebhook`) via `req.clone().text()` to preserve payload integrity for Stripe signature verification.
- Kept user subscription webhook handling in existing Hono route untouched; org subscription updates are isolated to the new org handler path.
