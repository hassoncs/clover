# Currency System Redesign - Invite Codes & Purchase UI

## Summary

Redesigned the currency and code redemption system to separate **Invite Codes** (authentication gate) from **Promo Codes** (currency grants), and created dedicated purchase UIs for Gems and Sparks.

## Key Changes

### 1. Invite Code System (Authentication Gate)

**Component**: `app/components/auth/InviteCodeInput.tsx`

- **Purpose**: Validates invite codes BEFORE allowing SSO authentication
- **Location**: Embedded directly in the login page
- **Behavior**: 
  - User must enter and validate an invite code first
  - SSO buttons are disabled until code is validated
  - Shows ✓ verification badge when valid
  - Beta-only during initial launch

**Integration**: 
- Removed auto-popup `SignupCodeGate` modal
- Invite code input is inline on login page
- Magic Link and Google Sign-In buttons disabled until invite code validated

### 2. Purchase UI System

**Three New Components**:

#### A. **BuyGemsModal** (`app/components/economy/BuyGemsModal.tsx`)
- Premium currency purchase UI
- 5 gem packs with pricing tiers
- "POPULAR" badge on best value pack
- Includes promo code redemption section
- Placeholder purchase handlers (ready for IAP integration)

#### B. **BuySparksModal** (`app/components/economy/BuySparksModal.tsx`)
- Compute credit purchase UI  
- 5 spark packs with generation estimates
- "BEST VALUE" badge on recommended pack
- Includes promo code redemption section
- Explains spark→dollar conversion (1 Spark ≈ $0.001)

#### C. **CurrencySheet** (`app/components/economy/CurrencySheet.tsx`)
- Main currency management page
- Shows current balance for both Gems 💎 and Sparks ⚡
- Quick-access buttons to open purchase modals
- "What's the difference?" explainer section
- Recent transaction history (last 10)
- Opens when clicking balance badge in header

### 3. Updated User Flow

#### Previous Flow (❌ Removed)
```
Login → Auto-popup SignupCodeGate → Skip or Redeem → Dashboard
```

#### New Flow (✅ Implemented)
```
Login Page:
  1. Enter invite code → Validate
  2. If valid, enable SSO buttons
  3. Sign in with Google / Magic Link
  
After Login:
  - Click balance badge → Opens CurrencySheet
  - Click "Buy Gems" → Opens BuyGemsModal
  - Click "Buy Sparks" → Opens BuySparksModal
  - Promo code redemption available in both purchase modals
```

## Database Schema (Already Exists)

### Invite Codes (signup_codes)
- Used during registration/authentication
- One-time redemption per user
- Grants initial sparks (default: 1000 = $1.00)

### Promo Codes (promo_codes)
- Available to existing users
- Multiple codes can be redeemed per user
- Grants sparks (variable amounts)
- Idempotent per user per code

## tRPC Routes (No Changes Needed)

Existing routes already support the new flow:
- `economy.validateSignupCode` - Validates invite codes
- `economy.redeemSignupCode` - Redeems invite code after signup
- `economy.redeemPromoCode` - Redeems promo codes for sparks
- `economy.getBalance` - Gets current Gem/Spark balance
- `economy.getTransactions` - Gets transaction history

## UI Screenshots

### Invite Code on Login Page
```
🎫 Have an Invite Code?
Slopcade is invite-only during beta
[ENTER INVITE CODE]
[Verify Invite Code]

[Disabled: Send Magic Link]
[Disabled: Continue with Google]

🔒 Slopcade is currently invite-only during beta.
Enter your invite code above to proceed.
```

### Currency Sheet
```
Currency                                    ✕

Your Balance
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💎 0 Gems

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ 1,000 Sparks
≈ $1.00 compute credit

┌───────────────┬───────────────┐
│  💎           │  ⚡           │
│  Buy Gems     │  Buy Sparks   │
│  Premium items│  AI generation│
└───────────────┴───────────────┘

What's the difference?
💎 Gems - Premium currency for exclusive items...
⚡ Sparks - Compute credits for AI generation...

Recent Transactions
• Welcome bonus with code LAUNCH    +1,000 sparks
```

### Buy Gems Modal
```
Buy Gems 💎                             ✕

Premium currency for exclusive items

┌─────────────────────────────────────┐
│ Starter Pack          │ $0.99       │
│ 100 gems              │             │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│         POPULAR                     │
│ Popular Pack    +200 bonus│ $9.99   │
│ 1200 gems                 │         │
└─────────────────────────────────────┘

Have a Promo Code?
[Enter promo code] [Redeem]
```

### Buy Sparks Modal
```
Buy Sparks ⚡                           ✕

Sparks power AI asset generation

┌─────────────────────────────────────┐
│ Starter Pack          │ $4.99       │
│ 5,000 sparks          │             │
│ ~50 assets            │             │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│         BEST VALUE                  │
│ Creator Pack          │ $9.99       │
│ 12,000 sparks         │             │
│ ~120 assets           │             │
└─────────────────────────────────────┘

Have a Promo Code?
[Enter promo code] [Redeem]

1 Spark ≈ $0.001 of compute
```

## Implementation Notes

### Removed Components
- ❌ Old `SignupCodeGate` modal (still exists but unused)
- ❌ Old `PromoCodeInput` standalone component (still exists but unused)

### Deprecated Patterns
- ❌ Auto-popup modals after login
- ❌ Embedded promo code input on project list

### New Patterns
- ✅ Inline invite code validation before SSO
- ✅ Modal-based purchase flows
- ✅ Centralized currency management sheet
- ✅ Promo codes contextually placed in purchase modals

## Next Steps (Future Work)

1. **IAP Integration**
   - Implement actual purchase handlers in `BuyGemsModal` and `BuySparksModal`
   - Connect to RevenueCat or App Store/Play Store APIs
   - Update `iap_products` and `iap_purchases` tables

2. **Invite Code Redemption Flow**
   - After successful SSO, auto-redeem the validated invite code
   - Grant initial sparks
   - Show welcome notification

3. **Gems Implementation**
   - Define what Gems can purchase
   - Implement gem balance tracking (currently placeholder)
   - Create gem-specific transaction types

4. **Analytics**
   - Track invite code validation attempts
   - Track purchase modal opens
   - Track promo code redemption success/failure rates

## Testing Checklist

- [ ] Invite code validation blocks SSO correctly
- [ ] Invalid invite codes show error message
- [ ] Valid invite codes enable SSO buttons
- [ ] Currency sheet opens when clicking balance badge
- [ ] Buy Gems modal opens and displays correctly
- [ ] Buy Sparks modal opens and displays correctly
- [ ] Promo code redemption works in purchase modals
- [ ] Transaction history displays correctly
- [ ] Balance updates after promo code redemption
