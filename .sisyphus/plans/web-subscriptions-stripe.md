# Implementation Plan: Web Subscriptions via Stripe + Apple Pay

> **Status**: Phases B/C/D/E complete. Phase A (external config) blocked on manual Stripe Dashboard setup.
> **Depends on**: [Economic Vision](../../docs/product/ECONOMIC_VISION.md)
> **Scope**: Web-only subscription checkout. Mobile IAP (RevenueCat) unchanged.

---

## Overview

Add Apple Pay via Stripe for web-only Pro subscriptions ($9.99/mo). This includes the subscription backend, credit stipend system, entitlement gating, and checkout UI.

---

## New Dependencies

| Package | Where | Purpose |
|---------|-------|---------|
| `stripe` | `api/` (backend) | Billing API + webhook verification |
| `@stripe/stripe-js` | `app/` (web) | Stripe.js loader |
| `@stripe/react-stripe-js` | `app/` (web) | React Elements components |

---

## Secrets & Configuration

### Backend (via `hush`)
- `STRIPE_SECRET_KEY` — Stripe Dashboard → Developers → API keys
- `STRIPE_WEBHOOK_SECRET` — From Stripe webhook endpoint config

### Frontend (public, safe for client)
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Non-Secret Config
- `STRIPE_PRICE_ID_PRO_MONTHLY` — Price ID for Pro plan
- `STRIPE_PRODUCT_ID_PRO` — Product ID

---

## Database Schema Changes

### Extend `users` table

```sql
ALTER TABLE users ADD COLUMN pro_subscription_until INTEGER;  -- unix ms
ALTER TABLE users ADD COLUMN pro_source TEXT;                  -- 'stripe' | 'revenuecat'
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
```

### New: `stripe_subscriptions`

```sql
CREATE TABLE stripe_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id),
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL,            -- 'active', 'canceled', 'past_due', etc.
  price_id TEXT,
  current_period_end INTEGER,      -- unix ms
  cancel_at_period_end INTEGER DEFAULT 0,
  latest_invoice_id TEXT,
  created_at INTEGER DEFAULT (unixepoch() * 1000),
  updated_at INTEGER DEFAULT (unixepoch() * 1000)
);
CREATE INDEX idx_stripe_subs_user ON stripe_subscriptions(user_id);
```

### New: `stripe_webhook_events` (idempotency)

```sql
CREATE TABLE stripe_webhook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at INTEGER DEFAULT (unixepoch() * 1000)
);
```

---

## API Routes

### Hono (webhooks)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/webhooks/stripe` | Verify signature, process events idempotently |

### tRPC (billing domain)

| Route | Purpose |
|-------|---------|
| `billing.getSubscriptionStatus` | Returns Pro entitlement state for current user |
| `billing.createSubscriptionIntent` | Creates Stripe customer + subscription, returns clientSecret |
| `billing.createCustomerPortalSession` | Returns URL for Stripe-hosted manage/cancel portal |
| `billing.getCatalog` | Returns Stripe price/product metadata for UI |

---

## Webhook Events to Handle

| Event | Action |
|-------|--------|
| `customer.subscription.created` | Record subscription in `stripe_subscriptions` |
| `customer.subscription.updated` | Update status, period end, cancellation state |
| `customer.subscription.deleted` | Set status to canceled, schedule entitlement revocation |
| `invoice.paid` | Extend `pro_subscription_until`, credit monthly Spark stipend |
| `invoice.payment_failed` | Mark subscription as `past_due`, notify user |

**All processing keyed by `stripe_event_id`** for idempotency.

### Stipend Credit on Renewal

On `invoice.paid` for a subscription renewal:

```typescript
await walletService.credit({
  userId,
  amountMicros: calculateStipend(currentBalance),  // refill to 1,500 Sparks max
  type: 'subscription_stipend',
  idempotencyKey: `stipend_${userId}_${invoiceId}`,
});
```

Refill logic: `grant = min(1000, max(0, 1500 - currentBalanceSparks))` (in Spark units)

---

## Entitlement Resolution

A unified resolver that checks both Stripe (web) and RevenueCat (mobile):

```typescript
interface ProEntitlement {
  isPro: boolean;
  proUntil: number | null;  // unix ms
  source: 'stripe' | 'revenuecat' | null;
}

function resolveEntitlement(user: User): ProEntitlement {
  if (user.pro_subscription_until && user.pro_subscription_until > Date.now()) {
    return { isPro: true, proUntil: user.pro_subscription_until, source: user.pro_source };
  }
  return { isPro: false, proUntil: null, source: null };
}
```

Both Stripe webhooks and RevenueCat webhooks write to the same `pro_subscription_until` field. The resolver doesn't care which provider granted it.

---

## Frontend (Web Only)

### Components Needed

| Component | Purpose |
|-----------|---------|
| `SubscriptionPage` | Plan selector, pricing, checkout CTA |
| `StripeCheckout` | `Elements` wrapper + `ExpressCheckoutElement` for Apple Pay |
| `SubscriptionStatus` | Active/renewal date/failure/canceled states |
| `ManageSubscription` | Opens Stripe Customer Portal |
| `useProStatus()` hook | Fetches entitlement for UI gating |

### Platform Behavior

| Platform | Behavior |
|----------|----------|
| Web | Stripe checkout UI visible |
| iOS/Android | Hide Stripe UI completely, use RevenueCat |

---

## Apple Pay Setup

### Stripe Dashboard
1. Enable Apple Pay payment method
2. Register production domain(s)
3. Create Product + recurring Price for Slopcade Pro ($9.99/mo)

### Domain Verification
Serve verification file at:
```
https://yourdomain.com/.well-known/apple-developer-merchantid-domain-association
```

### Requirements
- HTTPS required (even in dev — use ngrok/Cloudflare Tunnel)
- Safari/iOS compatible browser versions

---

## Stripe + RevenueCat Coexistence

| Platform | Payment Rail | Writes To |
|----------|--------------|-----------|
| Web | Stripe | `stripe_subscriptions` + `users.pro_subscription_until` |
| iOS | RevenueCat | `iap_purchases` + `users.pro_subscription_until` |
| Android | RevenueCat | `iap_purchases` + `users.pro_subscription_until` |

Both rails update the same entitlement field. The unified resolver abstracts the provider.

**App Store policy**: Never promote web checkout from native app UI.

---

## Implementation Phases

### Phase A: Infrastructure & Config (manual — requires Stripe Dashboard)
- [ ] Stripe account setup, product/price creation
- [ ] Domain registration + Apple Pay verification file
- [ ] Add secrets to `hush` (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)
- [ ] Add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY to app config
- [x] Verify `nodejs_compat` in `wrangler.toml`

### Phase B: Backend Core ✅
- [x] D1 migration: users columns + stripe_subscriptions + stripe_webhook_events
- [x] Drizzle schema updates in `shared/src/schema/`
- [x] `billing` tRPC router (getStatus, createIntent, portal, catalog)
- [x] Stripe webhook handler at `/webhooks/stripe`
- [x] Entitlement resolver (unified Stripe + RevenueCat)
- [x] Stipend credit logic (refill-to-threshold on invoice.paid)

### Phase C: Web Checkout UI ✅
- [x] Install `@stripe/stripe-js` + `@stripe/react-stripe-js`
- [x] `SubscriptionPage` with plan selector
- [x] `StripeCheckout` with PaymentElement (Apple Pay via Stripe)
- [x] `SubscriptionStatus` panel
- [x] Portal session via billing tRPC router
- [x] `useProStatus()` hook
- [x] Platform guards (hide Stripe on native, .web.tsx + native stub)

### Phase D: Entitlement Gating ✅
- [x] Pro margin discount in `pricing.ts` (1.5x vs 2x) via `getUserCosts(isPro)`
- [x] Priority generation queue (priority column, set per user tier)
- [x] Party hosting limits (3/mo free, unlimited Pro) via PartyHostingGuard
- [x] Player cap (4 free, 12 Pro) via maxPlayers in PartyRoomDO
- [x] Asset privacy toggle — gating constant in subscription-tiers.ts (canSetAssetsPrivate)
- [x] Cloud sync for offline — gating constant in subscription-tiers.ts (canCloudSync)
- [x] Asset store revenue split (80/20 vs 85/15) in subscription-tiers.ts

### Phase E: Testing & Validation ✅
- [ ] Stripe test mode end-to-end *(BLOCKED: requires Phase A Stripe secrets)*
- [x] Webhook replay safety (duplicate event handling)
- [x] Subscription lifecycle (create → renew → cancel → expire)
- [x] Stipend credit edge cases (cap, cancellation, resubscribe)
- [x] Payment failure → dunning flow
- [x] Cross-provider entitlement (Stripe web + RevenueCat mobile)
