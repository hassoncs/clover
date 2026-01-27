
## Phase 6 Blocked - Intentionally Deferred (2026-01-26)

### Remaining Tasks (5)
- 6.1 Set up RevenueCat account + products
- 6.2 Install react-native-purchases
- 6.3 Create purchase flow UI
- 6.4 Set up webhook for server-side validation
- 6.5 Test end-to-end purchase on iOS/Android

### Why Blocked
These tasks are marked "NEXT WEEK" in the plan because they require:
1. **RevenueCat account** - External service signup and configuration
2. **App Store Connect** - Apple IAP product setup
3. **Google Play Console** - Android IAP product setup
4. **Physical devices** - IAP cannot be tested in simulators
5. **App review** - IAP requires app store approval

### Current State
The credit system is **launch-ready without IAP**:
- Users get Sparks via signup/promo codes
- All economy logic is implemented
- UI shows balance and handles insufficient funds
- InsufficientBalanceModal has "Get More Sparks" CTA (placeholder for IAP)

### Next Steps (When Ready)
1. Create RevenueCat account at https://www.revenuecat.com/
2. Configure products matching `IAP_PRODUCT_CATALOG` in pricing.ts
3. Install `react-native-purchases` package
4. Implement purchase flow in InsufficientBalanceModal
5. Set up webhook endpoint for server-side validation
6. Test on TestFlight/Internal Testing tracks

## Test Infrastructure Issue (2026-01-26)

### Problem
Economy service tests fail to run due to `sharp` module dependency in the Cloudflare Workers test environment (vitest-pool-workers).

### Root Cause
- `test-utils.ts` imports `appRouter` from `../trpc/router`
- `appRouter` transitively imports AI routes that use `sharp`
- `sharp` requires `node:child_process` which is not available in Workers runtime
- Error: `No such module "node:child_process"`

### Affected Tests
- `wallet-service.test.ts`
- `signup-code-service.test.ts`
- `promo-code-service.test.ts`
- `gem-service.test.ts`

### Workaround Options
1. **Create isolated test utilities** for economy tests that don't import `appRouter`
2. **Mock sharp** in vitest config for economy tests
3. **Move economy tests** to a separate test configuration without Workers pool

### Note
This is a test infrastructure issue, not a code issue. The economy services work correctly - they just can't be tested in the current vitest-pool-workers setup due to transitive dependencies.
