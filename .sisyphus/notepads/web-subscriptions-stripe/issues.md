## 2026-02-15 Phase A Blockers (Manual/External Tasks)

### BLOCKED: Stripe account setup, product/price creation
- Requires human to log into Stripe Dashboard
- Create Product "Slopcade Pro" and Price "$9.99/mo"
- Cannot be automated

### BLOCKED: Domain registration + Apple Pay verification file
- Requires serving `.well-known/apple-developer-merchantid-domain-association`
- Requires HTTPS domain registration in Stripe Dashboard
- Cannot be automated

### BLOCKED: Add secrets to hush
- `STRIPE_SECRET_KEY` — from Stripe Dashboard → Developers → API keys
- `STRIPE_WEBHOOK_SECRET` — from Stripe webhook endpoint config
- Requires human to copy from Stripe Dashboard and run `hush set`

### BLOCKED: Add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY to app config
- Requires the publishable key from Stripe Dashboard
- Depends on Stripe account setup being complete

## 2026-02-16 Verification Issue

### Billing tests currently fail in baseline fixture setup
- Running `pnpm --filter @slopcade/api test:run src/billing/__tests__/billing-services.test.ts` fails before assertions in `initTestDatabase()` with:
  - `D1_ERROR: Cannot add a REFERENCES column with non-NULL default value: SQLITE_ERROR`
- This appears to be pre-existing test fixture/schema drift unrelated to the org billing route changes (type-check and build:types pass).

## 2026-02-16 Additional Verification Notes

### Existing billing test-suite bootstrap still fails
- `pnpm exec vitest run src/billing/__tests__/billing-services.test.ts` fails with the same `initTestDatabase()` migration/bootstrap error (`Cannot add a REFERENCES column with non-NULL default value`).
- This is pre-existing and unrelated to `OrgWebhookHandler` or `billing.stripeOrgWebhook` changes.
