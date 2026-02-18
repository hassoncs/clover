# Amen.games Launch — Human To-Do List

> **Status**: 60/113 plan tasks automated. These 53 remaining tasks require your hands.
> **Target**: Easter Sunday, April 5, 2026
> **Generated**: Feb 16, 2026

---

## 🔴 CRITICAL PATH (Do These First — Blocks Everything Else)

### 1. Create Supabase Project for amen.games
- [ ] Go to [supabase.com/dashboard](https://supabase.com/dashboard) → New Project
- [ ] Name: `amen-games-prod`
- [ ] Region: same as Slopcade (check existing project)
- [ ] Copy the **Project URL** and **anon key**
- [ ] Set these in your deployment secrets:
  - `AMEN_SUPABASE_URL` → Project URL
  - `AMEN_SUPABASE_ANON_KEY` → anon/public key
- [ ] Configure Auth providers: Google OAuth, Apple Sign-In, Email/Password
- [ ] Set redirect URLs for `amen.games` and `amen://` scheme
- **Why first**: Nothing auth-related works without this

### 2. Create Stripe Products
- [ ] Go to [Stripe Dashboard](https://dashboard.stripe.com/products) → Create Products
- [ ] **Church Subscriptions** (3 products):
  - Small Church: $199/year ($24/month) — `amen_church_small`
  - Medium Church: $499/year ($59/month) — `amen_church_medium`
  - Large Church: $999/year ($119/month) — `amen_church_large`
- [ ] **Individual Subscriptions** (2 prices on 1 product):
  - Amen+ Monthly: $4.99/month
  - Amen+ Yearly: $39.99/year
- [ ] Copy all **Price IDs** (starts with `price_...`)
- [ ] Set in deployment secrets:
  - `STRIPE_PRICE_ID_AMEN_MONTHLY` → monthly price ID
  - `STRIPE_PRICE_ID_AMEN_YEARLY` → yearly price ID
- [ ] Set up Stripe webhook endpoint: `https://api.amen.games/billing/stripeOrgWebhook`
- [ ] Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET`
- **Why second**: Billing doesn't work without real Stripe products

### 3. Generate App Icon & Splash Screen
- [ ] Use Scenario.com (or Midjourney/DALL-E) to generate:
  - **App Icon** (1024x1024): Navy (#1B3A6B) background, gold (#C9A84C) cross, minimalist
  - **Splash Screen** (1284x2778): Cream (#FDF8F0) background, gold cross, "Amen" text
  - **Favicon** (32x32 or 64x64): Simplified version of icon
- [ ] Save to:
  - `app/assets/brands/amen/icon.png`
  - `app/assets/brands/amen/splash.png`
  - `app/assets/brands/amen/favicon.png`
- [ ] Prompt suggestion: "Minimalist app icon, golden cross on deep navy blue background, clean modern design, no text, suitable for iOS App Store"

### 4. First Internal Build
- [ ] Run: `cd app && BRAND_ID=amen eas build --profile amen-preview --platform ios`
- [ ] Run: `cd app && BRAND_ID=amen eas build --profile amen-preview --platform android`
- [ ] Install on your device and verify:
  - [ ] Amen theme loads (cream/navy/gold, not Slopcade dark theme)
  - [ ] "Amen" appears everywhere (not "Slopcade")
  - [ ] Lab tab is hidden
  - [ ] Landing page shows on web when not logged in
  - [ ] Join org flow works
  - [ ] Subscription screen shows Amen+ pricing

---

## 🟡 CONTENT GENERATION (Needs API Keys + Budget)

### 5. Run Content Generation Pipeline
- [ ] Ensure `OPENROUTER_API_KEY` is set in hush vault
- [ ] Generate Bible trivia (target: 2,000):
  ```bash
  hush run -- pnpm content cli -- generate --game-type=amen-trivia --count=500 --model=quality
  # Repeat 4x, or increase count
  ```
- [ ] Generate quip prompts (target: 1,000):
  ```bash
  hush run -- pnpm content cli -- generate --game-type=amen-quip --count=500 --model=quality
  ```
- [ ] Generate drawing prompts (target: 500):
  ```bash
  hush run -- pnpm content cli -- generate --game-type=amen-drawing --count=500
  ```
- [ ] Generate fibbage facts (target: 500):
  ```bash
  hush run -- pnpm content cli -- generate --game-type=amen-fibbage --count=500
  ```
- [ ] Generate history events (target: 300):
  ```bash
  hush run -- pnpm content cli -- generate --game-type=amen-history --count=300
  ```
- [ ] **Estimated cost**: ~$15-30 total at quality tier (Claude Sonnet)

### 6. Run Automated Moderation
- [ ] After generation, run moderation:
  ```bash
  pnpm content cli -- moderate
  ```
- [ ] Review stats:
  ```bash
  pnpm content cli -- stats
  ```
- [ ] Check for rejected items and review manually if borderline

### 7. AI Theological Review
- [ ] Run a second pass with explicit theological review prompt:
  ```bash
  hush run -- pnpm content cli -- moderate --mode=ai-review
  ```
- [ ] Or manually spot-check 50-100 items for:
  - [ ] No Red Zone topics (predestination, baptism method, eucharist, etc.)
  - [ ] Scripture references are valid
  - [ ] Tone is warm/educational, not preachy
  - [ ] Content is ecumenical (safe for Catholic, Protestant, Orthodox)

### 8. Build & Deploy Content Packs
- [ ] Build final packs:
  ```bash
  pnpm content cli -- build-pack --name="Amen Trivia Pack v1" --game-type=amen-trivia --output=api/src/party/content/packs/amen/amen-trivia-v1.json
  pnpm content cli -- build-pack --name="Amen Quip Pack v1" --game-type=amen-quip --output=api/src/party/content/packs/amen/amen-quip-v1.json
  # ... repeat for each game type
  ```
- [ ] Update `prompt-loader.ts` to load the v1 packs
- [ ] Test each game type with real content

---

## 🟡 APP STORE (Needs Developer Accounts)

### 9. Register App Store Listings
- [ ] **Apple App Store Connect**:
  - [ ] Create new app: "Amen - Bible Party Games"
  - [ ] Bundle ID: `games.amen.app`
  - [ ] Category: Games → Trivia / Education
  - [ ] Age Rating: 4+ (no objectionable content)
  - [ ] Copy store listing from `docs/store-listing-amen.md`
- [ ] **Google Play Console**:
  - [ ] Create new app: "Amen - Bible Party Games"
  - [ ] Package: `games.amen.app`
  - [ ] Category: Games → Trivia
  - [ ] Content rating: Everyone
  - [ ] Copy store listing from `docs/store-listing-amen.md`

### 10. Store Screenshots & Preview
- [ ] Take screenshots on iPhone 15 Pro Max (6.7") and iPhone SE (4.7"):
  - Landing/home screen
  - Game in progress (trivia question)
  - Organization join screen
  - Subscription screen
  - Daily Scripture feature
- [ ] Take screenshots on Pixel 8 for Play Store
- [ ] Optional: Record 15-30 second app preview video (screen capture of a game round)
- [ ] Upload all to App Store Connect and Play Console

### 11. Submit for Review
- [ ] Build production: `cd app && BRAND_ID=amen eas build --profile amen-production`
- [ ] Submit to App Store (allow 3-5 days for review)
- [ ] Submit to Play Store (allow 1-3 days for review)
- [ ] If rejected, check feedback and fix

---

## 🟡 MARKETING & OUTREACH

### 12. Social Media Setup
- [ ] Create accounts:
  - [ ] Instagram: @amengames
  - [ ] TikTok: @amengames
  - [ ] X/Twitter: @amengames
  - [ ] Facebook Page: Amen Games
- [ ] Set profile photos (use app icon)
- [ ] Write bios using tagline: "Scripture. Fellowship. Fun."
- [ ] Link to amen.games

### 13. Influencer Outreach
- [ ] Review target list in `docs/influencer-targets.md`
- [ ] Send outreach messages to Tier 1 influencers first (10K+ followers)
- [ ] Offer: Free church subscription + promo code for their audience
- [ ] Use message template from `docs/press-kit-amen.md`
- [ ] Follow up after 3-5 days if no response

### 14. Pre-Launch Content
- [ ] Post 3-5 "coming soon" posts on social media
- [ ] Share Bible trivia clips (screenshot a trivia question, post as image)
- [ ] Tease game types: "8 games launching Easter 2026"
- [ ] Share Church Starter Kit with early-access pastors

### 15. Email Waitlist Blast
- [ ] Export waitlist: call `billing.getWaitlistEmails` via API
- [ ] Send launch announcement email (use Resend, Mailgun, or similar)
- [ ] Subject: "Amen launches this Easter! 🎉"
- [ ] Include: download links, promo code, Church Starter Kit PDF

---

## 🟡 TESTING & QA

### 16. End-to-End Game Testing
- [ ] Play each of the 8 Tier 1 games with real content:
  1. The Great Hall of Wisdom (trivia)
  2. The Fellowship Table (quiplash)
  3. Scrolls of Truth (fibbage)
  4. The Book of Ages (history)
  5. The Council (ranking)
  6. The Crossroads (dilemma)
  7. Illustrated Scripture (drawing)
  8. Who Am I? (headsup)
- [ ] Verify content loads correctly for each
- [ ] Check for any inappropriate content that slipped through moderation

### 17. Pilot Test with Churches
- [ ] Recruit 3-5 church/family groups (personal network, online communities)
- [ ] Give them free org subscriptions
- [ ] Have them run a game night
- [ ] Collect feedback on:
  - [ ] Content quality and appropriateness
  - [ ] UI clarity and ease of use
  - [ ] Game flow and fun factor
  - [ ] Technical issues (crashes, loading, etc.)
- [ ] Iterate based on feedback

### 18. Performance Testing
- [ ] Test with 10+ concurrent players in a single game session
- [ ] Monitor Cloudflare Workers metrics during test
- [ ] Check D1 query performance under load
- [ ] Verify Durable Objects handle WebSocket connections properly

---

## 🟢 LAUNCH WEEK (Mar 30 - Apr 5, 2026)

### 19. Holy Week Activation
- [ ] Verify Easter Special pack activates automatically (pack-scheduler.ts, Mar 30 - Apr 6)
- [ ] Verify Daily Scripture shows correct passage for each day
- [ ] Post daily on social media: Bible trivia clips, game highlights

### 20. Soft Launch (Mon-Thu)
- [ ] Share with pilot group and early adopters
- [ ] Monitor crash rates via Cloudflare dashboard
- [ ] Monitor error rates via monitoring endpoints
- [ ] Be ready for hotfixes (keep a terminal open)

### 21. Easter Sunday Launch (Apr 5)
- [ ] Flip the switch: make app publicly available
- [ ] Social media push: "He is risen! Celebrate with your church tonight"
- [ ] Monitor KPIs: downloads, signups, game sessions, org registrations
- [ ] Respond to any App Store reviews

### 22. Post-Launch (Week of Apr 6)
- [ ] Monitor retention: Day 1, Day 3, Day 7
- [ ] Collect and respond to App Store reviews
- [ ] Deploy Tier 2 games if content is ready
- [ ] Write retrospective: what worked, what didn't, what's next

---

## Reference Files

| Document | Path |
|----------|------|
| Master Plan | `.sisyphus/plans/white-label-christian-party-games.md` |
| Store Listing Copy | `docs/store-listing-amen.md` |
| Church Starter Kit | `docs/church-starter-kit.md` |
| Press/Influencer Kit | `docs/press-kit-amen.md` |
| Influencer Targets | `docs/influencer-targets.md` |
| Production Readiness | `docs/production-readiness-report.md` |
| Security Audit | `.sisyphus/notepads/white-label-christian-party-games/security-audit.md` |
| Brand Manifest | `packages/brands/src/manifests/amen.ts` |

## Quick Reference: Key Commands

```bash
# Build amen app
cd app && BRAND_ID=amen eas build --profile amen-preview

# Generate content
hush run -- pnpm content cli -- generate --game-type=amen-trivia --count=500

# Run moderation
pnpm content cli -- moderate

# Check stats
pnpm content cli -- stats

# Build content pack
pnpm content cli -- build-pack --name="Pack Name" --game-type=amen-trivia --output=path/to/output.json

# Deploy API
cd api && wrangler deploy --minify --define __DEV__:false
```
