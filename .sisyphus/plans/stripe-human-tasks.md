# Stripe Setup — Human Tasks

Everything below requires browser access to dashboards or manual CLI steps.

---

## 1. Stripe Dashboard Setup

Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)

### Create Product + Price
1. **Products** → **Add product**
2. Name: `Slopcade Pro`
3. Add a recurring price: **$9.99 / month**
4. Save — copy the **Price ID** (starts with `price_`)
5. Copy the **Product ID** (starts with `prod_`)

### Get API Keys
1. **Developers** → **API keys**
2. Copy the **Secret key** (starts with `sk_test_` or `sk_live_`)
3. Copy the **Publishable key** (starts with `pk_test_` or `pk_live_`)

### Create Webhook Endpoint
1. **Developers** → **Webhooks** → **Add endpoint**
2. URL: `https://slopcade-api.hassoncs.workers.dev/webhooks/stripe`
3. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Save — copy the **Signing secret** (starts with `whsec_`)

### Enable Apple Pay
1. **Settings** → **Payment methods** → Enable **Apple Pay**
2. **Settings** → **Apple Pay** → **Add new domain**
3. Enter your production domain (e.g. `slopcade.com`)
4. Download the verification file and serve it (see step 3 below)

---

## 2. Add Secrets to Hush

```bash
hush set STRIPE_SECRET_KEY "sk_test_..."
hush set STRIPE_WEBHOOK_SECRET "whsec_..."
```

These are already referenced in `api/src/trpc/context.ts` as `Env.STRIPE_SECRET_KEY` and `Env.STRIPE_WEBHOOK_SECRET`.

Also add the price ID:
```bash
hush set STRIPE_PRICE_ID_PRO_MONTHLY "price_..."
```

---

## 3. Apple Pay Domain Verification

Stripe gives you a file to serve at:
```
https://yourdomain.com/.well-known/apple-developer-merchantid-domain-association
```

Option A — Cloudflare Workers (recommended):
Add a route in `api/src/index.ts` that serves the file contents:
```typescript
app.get("/.well-known/apple-developer-merchantid-domain-association", (c) => {
  return c.text("PASTE_VERIFICATION_FILE_CONTENTS_HERE");
});
```

Option B — Static file in `app/public/`:
Place the file at `app/public/.well-known/apple-developer-merchantid-domain-association`

---

## 4. Frontend Env Var

Add the publishable key to your `.env` or Expo config:

```bash
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

This is read by `app/lib/config/env.ts` → `env.stripePublishableKey`.

---

## 5. Wrangler Secrets (for deployed Workers)

```bash
cd api
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put STRIPE_PRICE_ID_PRO_MONTHLY
```

---

## 6. Run Migrations

```bash
cd api
npx wrangler d1 execute slopcade-db --file=migrations/20260215_stripe_subscriptions.sql
npx wrangler d1 execute slopcade-db --file=migrations/20260215_pro_entitlement_gating.sql
```

For local dev:
```bash
npx wrangler d1 execute slopcade-db --local --file=migrations/20260215_stripe_subscriptions.sql
npx wrangler d1 execute slopcade-db --local --file=migrations/20260215_pro_entitlement_gating.sql
```

---

## 7. Test Mode Verification

Once all the above is done:

1. Start dev: `pnpm dev`
2. Open web: `http://localhost:8085/settings/subscription`
3. Sign in
4. Click through the checkout flow using Stripe test card: `4242 4242 4242 4242`
5. Verify webhook fires at `http://localhost:8789/webhooks/stripe` (use `stripe listen --forward-to localhost:8789/webhooks/stripe` for local testing)
6. Check D1 for `stripe_subscriptions` row and `pro_subscription_until` on user

---

## Quick Reference — All Keys Needed

| Key | Where | Format |
|-----|-------|--------|
| `STRIPE_SECRET_KEY` | hush + wrangler | `sk_test_...` or `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | hush + wrangler | `whsec_...` |
| `STRIPE_PRICE_ID_PRO_MONTHLY` | hush + wrangler | `price_...` |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | .env / app config | `pk_test_...` or `pk_live_...` |
