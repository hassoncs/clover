# Gem & Spark Economy: Product Specification

## Overview
The Slopcade economy revolves around two virtual currencies (Gems and Sparks) and a premium membership ("Slopcade Pro") that enables offline play and enhanced game generation capabilities.

**Bundle ID**: `me.ch5.slopcade.app`

---

## Product Catalog (Quantity-Based Naming)

> **Design Principle:** Product IDs encode **quantities** (permanent), not prices (Apple-controlled). This allows pricing flexibility for sales, regional variants, and intro offers without breaking server logic.

### 1. Slopcade Pro Membership (Subscription)
**Primary Benefit:** Fully offline game capability, premium asset generation, and monthly currency stipend.

| Product ID | Name | Type | Current Price | Grants |
|------------|------|------|---------------|--------|
| `slopcade.pro.monthly` | Slopcade Pro | Auto-Renewable | $9.99/mo | 500 Gems/mo + 100 Sparks/mo |

### 2. Gems (Hard Currency)
Used for unlocking premium templates, special effects, and rapid game generation.

| Product ID | Name | Type | Current Price | Grants |
|------------|------|------|---------------|--------|
| `slopcade.gems.100` | Gems 100 | Consumable | $1.99 | 100 Gems |
| `slopcade.gems.300` | Gems 300 | Consumable | $4.99 | 300 Gems |
| `slopcade.gems.1500` | Gems 1500 | Consumable | $19.99 | 1500 Gems |

### 3. Sparks (Utility Currency)
Used for AI asset tweaks, sprite re-rolling, and minor gameplay boosts.

| Product ID | Name | Type | Current Price | Grants |
|------------|------|-------|---------------|--------|
| `slopcade.sparks.50` | Sparks 50 | Consumable | $0.99 | 50 Sparks |
| `slopcade.sparks.200` | Sparks 200 | Consumable | $2.99 | 200 Sparks |
| `slopcade.sparks.1000` | Sparks 1000 | Consumable | $9.99 | 1000 Sparks |

**Why Quantity-Based?**
- ✅ Product IDs are permanent API contracts
- ✅ Prices can change in App Store Connect without breaking server logic
- ✅ Supports sales, regional pricing, and intro offers
- ✅ Clear mapping: `slopcade.gems.300` always grants 300 gems
- ❌ Price-based IDs (`gems.499`) become lies when pricing changes

---

## Apple IAP Server Architecture

### Core Rule (Apple's Requirement)
> Anything that costs real money to operate on your server must be purchased via Apple IAP, validated server-side, and granted by your server, not the client.

If Apple can bypass your server and mint value locally → App Store rejection or fraud.

### Architecture Diagram

```
┌─────────┐     ┌─────────────┐     ┌─────────────────┐
│  iOS    │────▶│    Apple    │────▶│   Your Server   │
│  App    │     │ App Store   │     │  (Source of     │
│ (Untrusted)    │ (Trusted)   │     │   Truth)        │
└─────────┘     └─────────────┘     └─────────────────┘
                                               │
                                               ▼
                                         ┌─────────────┐
                                         │   Database  │
                                         │ (Credits)   │
                                         └─────────────┘
```

---

### Flow: Consumable Credits (Gems & Sparks)

#### 1️⃣ User Initiates Purchase
- iOS app uses StoreKit 2
- Product IDs match App Store Connect exactly
- **No credits granted yet**

#### 2️⃣ Apple Returns Signed Transaction
App receives:
- Transaction ID (e.g., `1234567890`)
- JWS receipt (cryptographically verifiable)

#### 3️⃣ App Forwards Receipt to Server
```typescript
POST /api/iap/verify
{
  transactionId: "1234567890",
  signedTransaction: "eyJhbGciOiJFUzI1NiIs..."
}
```
**Client's only job:** Forward Apple's proof.

#### 4️⃣ Server Validates with Apple
Backend must:
- Verify JWS signature using Apple public keys
- Confirm bundle ID matches `me.ch5.slopcade.app`
- Confirm product ID is valid
- Check transaction not previously used
- Verify not revoked/refunded
- Detect sandbox vs production environment

#### 5️⃣ Server Grants Credits (Idempotent)
```sql
BEGIN;

-- Deduplication: transaction IDs can only be used once
INSERT INTO apple_transactions (transaction_id, user_id, product_id)
VALUES ('1234567890', $userId, 'slopcade.gems.100')
ON CONFLICT DO NOTHING;

-- Grant credits based on product ID → quantity mapping
UPDATE users
SET gems = gems + (
  CASE product_id
    WHEN 'slopcade.gems.100' THEN 100
    WHEN 'slopcade.gems.300' THEN 300
    WHEN 'slopcade.gems.1500' THEN 1500
    ELSE 0
  END
)
WHERE id = $userId
AND NOT EXISTS (SELECT 1 FROM apple_transactions WHERE transaction_id = '1234567890');

COMMIT;
```

**Product Grant Mapping (Server-Side):**
```typescript
const PRODUCT_GRANTS: Record<string, { gems?: number; sparks?: number }> = {
  'slopcade.gems.100': { gems: 100 },
  'slopcade.gems.300': { gems: 300 },
  'slopcade.gems.1500': { gems: 1500 },
  'slopcade.sparks.50': { sparks: 50 },
  'slopcade.sparks.200': { sparks: 200 },
  'slopcade.sparks.1000': { sparks: 1000 },
  'slopcade.pro.monthly': { gems: 500, sparks: 100 }, // monthly grant
};
```

**Key:** 
- Transaction idempotency prevents double-granting
- Product ID encodes quantity, not price
- Pricing lives only in App Store Connect

#### 6️⃣ App Syncs State
App calls `GET /api/me` → receives updated balance → renders UI.

---

### Flow: Subscription (Slopcade Pro)

#### 1️⃣ User Purchases Subscription
- Auto-renewing subscription in App Store Connect
- StoreKit 2 initiates purchase

#### 2️⃣ Server Handles Apple Server Notifications
Apple calls your server when:
- Subscription purchased
- Renewal occurred
- Cancellation
- Refund
- Billing issue

```typescript
POST /api/iap/notification
{
  notificationType: "DID_RENEW",
  autoRenewStatus: true,
  originalTransactionId: "..."
}
```

#### 3️⃣ Daily Grant (Server-Side)
Server checks subscription status daily:
- Queries Apple API for current subscription state
- Grants 500 Gems + 100 Sparks if active
- Never trust client subscription status

---

### Database Schema

```sql
-- Apple transactions (immutable audit log)
CREATE TABLE apple_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR(64) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  product_id VARCHAR(64) NOT NULL,  -- e.g., 'gems.199'
  amount INTEGER NOT NULL,          -- gems/sparks granted
  currency_type TEXT NOT NULL,       -- 'gems' or 'sparks'
  environment TEXT NOT NULL,         -- 'sandbox' or 'production'
  raw_receipt JSONB,                 -- Full Apple receipt
  created_at TIMESTAMP DEFAULT NOW()
);

-- User balances (single source of truth)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  gems INTEGER DEFAULT 0,
  sparks INTEGER DEFAULT 0,
  pro_subscription_until TIMESTAMP,  -- NULL if not subscribed
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_apple_transactions_user ON apple_transactions(user_id);
```

---

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/iap/verify` | Verify IAP receipt, grant credits |
| POST | `/api/iap/notification` | Apple Server Notifications (webhook) |
| GET | `/api/iap/products` | List available products (for UI) |
| GET | `/api/iap/history` | User's purchase history |
| POST | `/api/iap/restore` | Restore purchases (App Store requirement) |

---

### Anti-Fraud Must-Haves

| Measure | Implementation |
|---------|----------------|
| Transaction deduplication | UNIQUE constraint on `transaction_id` |
| Receipt validation | Server-side JWS verification |
| Apple notifications | Webhook endpoint for refunds/chargebacks |
| Server-side balance | Never trust client-reported balances |
| Environment detection | Sandbox receipts for development |

---

### Offline Mode (Slopcade Pro)

- **Validation:** Encrypted JWT with membership status + expiry
- **Local Cache:** Godot WASM/Native binaries + recent game assets
- **Sync:** Background sync to Supabase on reconnection
- **Grace Period:** 7 days offline access after subscription expires

---

## Implementation Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1. RevenueCat Setup | ⏳ | Create project, configure products in dashboard |
| 2. Database Schema | ⏳ | apple_transactions, user balance columns |
| 3. Verify Endpoint | ⏳ | /api/iap/verify with Apple receipt validation |
| 4. Notification Endpoint | ⏳ | /api/iap/notification for Apple Server Notifications |
| 5. StoreKit Integration | ⏳ | RevenueCat SDK in iOS app |
| 6. UI Components | ⏳ | CreditBalance, purchase screens, Pro badge |
| 7. Offline Mode | ⏳ | JWT validation + local caching |

---

## App Store Connect Configuration

### Products to Create

| Product | Product ID | Type | Initial Price |
|---------|------------|------|---------------|
| Gems 100 | `slopcade.gems.100` | Consumable | $1.99 |
| Gems 300 | `slopcade.gems.300` | Consumable | $4.99 |
| Gems 1500 | `slopcade.gems.1500` | Consumable | $19.99 |
| Sparks 50 | `slopcade.sparks.50` | Consumable | $0.99 |
| Sparks 200 | `slopcade.sparks.200` | Consumable | $2.99 |
| Sparks 1000 | `slopcade.sparks.1000` | Consumable | $9.99 |
| Slopcade Pro | `slopcade.pro.monthly` | Auto-Renewable | $9.99/mo |

**Note:** "Initial Price" can be changed freely in App Store Connect. Product IDs are permanent.

### Required Settings
- **Bundle ID:** `me.ch5.slopcade.app`
- **Sandbox Testing:** Enable TestFlight for IAP testing
- **Receipt Verification:** Production URL + Sandbox URL configured

---

## RevenueCat Integration

**Recommended:** RevenueCat simplifies cross-platform IAP (iOS + Android).

```typescript
// App side (StoreKit 2 via RevenueCat)
import { Purchases } from 'react-native-purchases';

await Purchases.configure({ apiKey: 'revenuecat_api_key' });

// Purchase
const { productIdentifier, transactionId } = await Purchases.purchaseProduct('slopcade.gems.100');

// Send to server
await fetch('/api/iap/verify', {
  method: 'POST',
  body: JSON.stringify({ transactionId, signedTransaction: transactionId })
});
```

**Benefits:**
- Unified SDK for iOS StoreKit + Google Play Billing
- Receipt validation handled (still validate server-side for security)
- Analytics and cohort analysis
- Easier subscription management

---

## Common Pitfalls (Avoid These)

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| Grant credits locally in app | Server grants after Apple verification |
| Trust client-reported balance | Server is authoritative source |
| Skip receipt validation | Always verify JWS with Apple |
| Single insertion without deduplication | UNIQUE constraint on transaction_id |
| Trust subscription status from client | Query Apple API server-side |
| No refund handling | Implement notification webhook |

---

## References

- [Apple StoreKit 2 Documentation](https://developer.apple.com/documentation/storekit)
- [RevenueCat IAP Guide](https://www.revenuecat.com/docs)
- [Apple Server Notifications](https://developer.apple.com/documentation/storekit/server_notifications)
