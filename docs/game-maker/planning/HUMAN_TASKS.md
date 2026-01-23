# Human Tasks - Clover Game Maker MVP

> Tasks that require human intervention: API keys, account signups, manual testing, and deployment.

**Generated**: 2026-01-21

---

## Priority Legend

| Priority  | Meaning                 |
| --------- | ----------------------- |
| 🔴 **P0** | Blocking MVP launch     |
| 🟡 **P1** | Required for production |
| 🟢 **P2** | Nice to have / Post-MVP |

---

## 1. Account Signups & API Keys 🔴 P0

### 1.1 Supabase (Authentication)

**Status**: Not configured

**Tasks**:

- [ ] Create Supabase project at https://supabase.com
- [ ] Enable Email (Magic Link) auth provider
- [ ] Enable Google OAuth provider
- [ ] Enable Apple OAuth provider (required for iOS App Store)
- [ ] Configure redirect URLs:
  - Native: `slopcade://auth/callback`
  - Development: `http://localhost:8085/auth/callback`
  - Production: `https://your-domain.com/auth/callback`
- [ ] Copy credentials to `.hush`:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Run `pnpm hush:encrypt` after adding secrets

**Docs**: [Supabase Auth Docs](https://supabase.com/docs/guides/auth)

---

### 1.2 OpenRouter or OpenAI (AI Generation)

**Status**: Code implemented, keys required

**Tasks**:

- [ ] Create account at https://openrouter.ai OR https://platform.openai.com
- [ ] Generate API key
- [ ] Add to production secrets:
  - `OPENROUTER_API_KEY` (recommended) OR
  - `OPENAI_API_KEY` OR
  - `ANTHROPIC_API_KEY`
- [ ] Set in Cloudflare Workers secrets:
  ```bash
  cd api
  npx wrangler secret put OPENROUTER_API_KEY
  ```

**Cost Estimate**: ~$0.01-0.05 per game generation

---

### 1.3 Scenario.com (Image Generation)

**Status**: Code implemented, keys required

**Tasks**:

- [ ] Create account at https://scenario.com
- [ ] Navigate to API settings
- [ ] Generate API key pair:
  - `SCENARIO_API_KEY`
  - `SCENARIO_SECRET_API_KEY`
- [ ] Set in Cloudflare Workers secrets:
  ```bash
  cd api
  npx wrangler secret put SCENARIO_API_KEY
  npx wrangler secret put SCENARIO_SECRET_API_KEY
  ```

**Cost Estimate**: ~$0.02-0.10 per sprite generated

**Note**: Without these keys, the app uses colored placeholder shapes instead of AI-generated sprites.

---

### 1.4 Cloudflare (Already Configured)

**Status**: ✅ D1 database configured

**Verify**:

- [ ] R2 bucket `clover-assets` exists and is public
- [ ] Custom domain configured for R2 (optional): `assets.clover.app`
- [ ] Workers secrets are set (see above)

---

## 2. Manual Testing 🔴 P0

### 2.1 Auth Flow Testing

- [ ] Test Magic Link email flow on iOS simulator
- [ ] Test Magic Link email flow on web
- [ ] Verify session persistence after app restart
- [ ] Verify protected API routes reject unauthenticated requests
- [ ] Test Google OAuth on iOS
- [ ] Test Apple OAuth on iOS (required for App Store)

### 2.2 E2E Game Generation Flow

**Prerequisites**: API keys configured (Section 1)

- [ ] Open Create tab
- [ ] Enter prompt: "A game where I throw balls at targets"
- [ ] Verify loading state appears
- [ ] Verify game definition is generated (< 30 seconds)
- [ ] Tap "Play" and verify game runs
- [ ] Tap "Save" and verify game appears in Library
- [ ] Close and reopen app, verify game persists
- [ ] Play saved game from Library

### 2.3 Device Testing Matrix

| Platform | Device      | Status |
| -------- | ----------- | ------ |
| iOS      | Simulator   | [ ]    |
| iOS      | Real device | [ ]    |
| Android  | Emulator    | [ ]    |
| Android  | Real device | [ ]    |
| Web      | Chrome      | [ ]    |
| Web      | Safari      | [ ]    |

### 2.4 Performance Testing

- [ ] Generate game with 20+ entities, verify 60fps
- [ ] Test on older device (iPhone 11 or equivalent)
- [ ] Verify memory usage stays reasonable (< 200MB)
- [ ] Test repeated game generation (no memory leaks)

---

## 3. Production Deployment 🟡 P1

### 3.1 API Deployment

```bash
cd api
npx wrangler deploy
```

- [ ] Verify deployment succeeds
- [ ] Test production health endpoint: `GET /health`
- [ ] Verify D1 database is accessible
- [ ] Verify R2 bucket is accessible

### 3.2 App Build

**iOS**:

- [ ] Update `app.json` with production bundle ID
- [ ] Configure Apple Developer account
- [ ] Generate provisioning profiles
- [ ] Build: `npx eas build --platform ios`

**Android**:

- [ ] Update `app.json` with production package name
- [ ] Generate signing key
- [ ] Build: `npx eas build --platform android`

### 3.3 Environment Configuration

Production `.hush` should contain:

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
OPENROUTER_API_KEY=sk-or-...
# Note: Scenario keys are set via wrangler secret, not .hush
```

---

## 4. App Store Preparation 🟢 P2

### 4.1 iOS App Store

- [ ] App Store Connect account setup
- [ ] App icon (1024x1024)
- [ ] Screenshots for all required device sizes
- [ ] App description and keywords
- [ ] Privacy policy URL
- [ ] COPPA compliance (target audience includes children)
- [ ] Review guidelines compliance check

### 4.2 Google Play Store

- [ ] Google Play Console account ($25 one-time)
- [ ] App icon
- [ ] Feature graphic (1024x500)
- [ ] Screenshots
- [ ] App description
- [ ] Privacy policy URL
- [ ] Content rating questionnaire
- [ ] Data safety form

---

## 5. Post-MVP Enhancements 🟢 P2

### 5.1 Optional Features

- [ ] Onboarding tutorial flow
- [ ] Sound effects system
- [ ] Haptic feedback
- [ ] Share game as link
- [ ] Public game gallery

### 5.2 Analytics & Monitoring

- [ ] Sentry error tracking
- [ ] PostHog or Mixpanel analytics
- [ ] Cloudflare analytics for API
- [ ] AI generation quality metrics

---

## Quick Start Checklist

For getting MVP running locally with full functionality:

```
[ ] 1. Sign up for Supabase → get keys
[ ] 2. Sign up for OpenRouter → get key
[ ] 3. Sign up for Scenario.com → get key pair
[ ] 4. Add to .hush and run `pnpm hush:encrypt`
[ ] 5. Set Cloudflare secrets: `npx wrangler secret put <KEY>`
[ ] 6. Run `pnpm dev` and test full flow
```

---

_This document should be updated as tasks are completed. Check off items using `[x]`._
