
## 2026-02-16: Billing & Subscription Support for Amen

### Implementation
- Added `AMEN_INDIVIDUAL_TIERS` to `subscription-tiers.ts`
- Updated `createSubscriptionIntent` to map internal plan IDs (e.g., `amen_plus_monthly`) to Stripe Price IDs from environment variables
- `getCatalog` now returns brand-specific plans based on `ctx.brandId`
- `StripeCheckout` component updated to accept `priceId` and `priceDisplay` props
- `SubscriptionStatus` updated to show brand-specific branding and features

### Amen Brand Specifics
- Added "Amen+" subscription tiers: Monthly ($4.99) and Yearly ($39.99)
- Used Amen brand colors (Navy #1B3A6B, Gold #C9A84C) for subscription UI
- Features list customized for Amen (no AI generation, unlimited games, no ads)

## 2026-02-16: UI Isolation & Deep Linking

### Deep Linking
- Configured `intentFilters` in `app.config.ts` for Android to handle `https://{brand.domain}/join/*`.
- Configured `associatedDomains` for iOS.
- Created `app/app/join/[slug].tsx` to handle the deep link route.

### Organization Joining
- Added `getBySlug` and `joinBySlug` to `organizationsRouter` to support joining via public slug links.
- Implemented UI in `join/[slug].tsx` to show org details and join button.

### Brand Configuration
- Added `appStoreReviewUrl` to `BrandManifest` to support brand-specific review links.
- Added "Rate Us" button to Profile screen using `Linking.openURL`.

### UI Isolation
- Added "Party Games Only" header to Feed screen when `partyGamesOnly` feature flag is active.
