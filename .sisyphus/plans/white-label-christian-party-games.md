# amen.games — White-Label Christian Party Game Platform

> **Brand**: amen.games
> **Domain**: amen.games (registered)
> **Target Launch**: Easter 2026 (April 5)
> **Strategy**: Same backend as Slopcade, completely isolated branded frontend
> **Status**: Planning

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Decisions Log](#decisions-log)
3. [Market Context](#market-context)
4. [Architecture — Multi-Brand Platform](#architecture--multi-brand-platform)
5. [Backend — Multi-Tenant API](#backend--multi-tenant-api)
6. [Frontend — Brand Variant System](#frontend--brand-variant-system)
7. [Account Isolation & Auth](#account-isolation--auth)
8. [Organization & Church Subscriptions](#organization--church-subscriptions)
9. [Monetization Model](#monetization-model)
10. [Content Generation Pipeline](#content-generation-pipeline)
11. [Game Selection & Theming](#game-selection--theming)
12. [Content Tone & Guidelines](#content-tone--guidelines)
13. [Visual Identity & Assets](#visual-identity--assets)
14. [Timeline — 7 Weeks to Easter](#timeline--7-weeks-to-easter)
15. [Go-to-Market Strategy](#go-to-market-strategy)
16. [Risk Assessment](#risk-assessment)

---

## Executive Summary

**amen.games** is a white-labeled version of the Slopcade party game platform, re-themed entirely around Christianity and the Bible. It targets churches, youth groups, Bible study groups, and Christian families who want a reverent, educational, family-friendly alternative to Jackbox Games.

The product ships 8 party games at launch, all powered by AI-generated content grounded in scripture. Churches can purchase annual subscriptions that give their entire congregation access. Individual users can play free with limits or subscribe individually.

Users of amen.games will have **zero awareness** that it shares infrastructure with Slopcade. Separate accounts, separate branding, separate app store listings, separate domain — one shared backend.

---

## Decisions Log

| Decision | Resolution | Rationale |
|----------|-----------|-----------|
| Brand name | **amen.games** | Domain registered. Clean, memorable, instantly communicates purpose. |
| Account isolation | **Fully isolated** | A Slopcade user cannot log into amen.games and vice versa. Separate Supabase projects. |
| Denominational scope | **Broadly ecumenical** | Content safe for all major denominations. Avoid contentious theology. Maximize TAM. |
| Content tone | **Reverent, educational, warm** | Not irreverent like Slopcade. Respectful of faith. Fun but never mocking. |
| Monetization | **Freemium individual + Church org subscriptions** | Mirrors proven church SaaS models (RightNow Media, Kahoot EDU). |
| Org model | **Attendance-based flat tiers** | Industry standard for church software. No per-seat billing. |
| Member onboarding | **Join code + join link** | Zero-friction for congregants. Admin generates code/link. |
| Build-time vs runtime | **Hybrid** | Build-time for app identity; runtime for content/theme. |
| Separate package per brand | **No** | Single codebase, brand manifest system. Split only if feature divergence demands it. |

---

## Market Context

### Target Audience

| Segment | Size (US) | Entry Point | Willingness to Pay |
|---------|----------|-------------|-------------------|
| Catholic Church | ~61M members | Youth ministry, CCD, parish events | HIGH — established tech budget culture |
| Southern Baptist | ~13.2M members | Youth groups, VBS, fellowship nights | HIGH — large engaged congregations |
| United Methodist | ~5.4M members | Small groups, retreats | MEDIUM |
| Church of God in Christ | ~5.3M members | Youth ministry | MEDIUM |
| National Baptist Convention | ~5.0M members | Fellowship events | MEDIUM |
| Assemblies of God | ~3.0M members | Youth-forward, tech-savvy | HIGH |
| Nondenominational | ~15-20% of Protestants | Youth groups, small groups | HIGH — fastest growing segment |

**Total addressable**: ~170M US Christians. **Serviceable**: Churches with active youth/fellowship programs (~300,000 US congregations).

### Church Technology Landscape

- 86% of church leaders say technology is vital for community connection
- Churches typically allocate 2-5% of annual budget to technology/media
- Mid-sized church ($500k budget) = $10k-$25k/year tech spend
- Church streaming/media is surging (The Chosen: 700M+ views)

### Competitive Landscape

| Competitor | What They Do | Gap We Fill |
|-----------|-------------|------------|
| TruPlay Games | Subscription Christian mobile games | Single-player focused, no party/group play |
| Biblia Trivia | Bible quiz app with multiplayer | Trivia only, no variety of game types |
| Bible Undercover | Social deduction (Mafia-style) | One game type only |
| CrowdVibe | Live polls/quizzes for youth groups | Not games — engagement tool only |
| Cards Christians Like | Physical card game | Physical only, no digital, no remote play |

**Our unique position**: The only **digital party game platform** with **multiple game types** designed specifically for **church groups playing together**. Jackbox for churches — nothing else exists.

### Easter Planning Calendar

| Month | Church Activity | Our Action |
|-------|----------------|------------|
| January | Vision casting, annual planning | Ideal time to pitch annual subs |
| February | Easter planning begins, Lent content needed | Pre-launch outreach to youth pastors |
| March | Final Easter prep, demand for group activities | Marketing push, pilot groups |
| April 5 (Easter) | Peak engagement, family gatherings | **LAUNCH** |

**Critical insight**: We are late in the Easter planning cycle. Most churches plan Easter activities in January-February. Our launch timing means we should position for **Easter week game nights** and **post-Easter retention** rather than trying to be part of formal Easter programming.

---

## Architecture — Multi-Brand Platform

### Hybrid Build-time + Runtime Approach

| Layer | Strategy | Controls |
|-------|----------|----------|
| **Build-time** | `BRAND_ID` env var in `app.config.ts` + EAS profiles | App name, bundle ID, icon, splash, deep-link scheme, store listing |
| **Runtime** | `x-brand-id` request header → `ctx.brandId` | Content filtering, theme tokens, feature flags, copy, org features |
| **Auth-time** | Separate Supabase projects per brand | Complete account isolation, no cross-brand identity leakage |

### Repo Structure

```
packages/brands/
  src/
    types.ts                    # BrandId, BrandManifest, BrandTheme, BrandContentPolicy
    manifests/
      slopcade.ts               # Default brand
      amen.ts                   # amen.games brand
    index.ts                    # getBrandManifest(), BRAND_IDS, validation
    content-policy.ts           # Brand-specific content rules
  package.json

app/assets/brands/
  slopcade/                     # Existing assets (moved from app/assets/)
    icon.png
    adaptive-icon.png
    splash.png
    favicon.png
  amen/                         # amen.games assets
    icon.png
    adaptive-icon.png
    splash.png
    favicon.png
    store-screenshots/
    feature-graphic.png
```

### Brand Manifest Shape

```typescript
type BrandId = 'slopcade' | 'amen'

interface BrandManifest {
  id: BrandId
  displayName: string                       // "Amen"
  legalName: string                         // "Amen Games LLC" (or whatever entity)
  domain: string                            // "amen.games"
  tagline: string                           // "Scripture. Fellowship. Fun."

  // App Store Identity
  ios: { bundleIdentifier: string }         // "games.amen.app"
  android: { package: string }              // "games.amen.app"
  scheme: string                            // "amen"

  // Auth (separate Supabase project per brand)
  auth: {
    supabaseUrl: string
    supabaseAnonKey: string
    providers: ('google' | 'apple' | 'email')[]
  }

  // Visual Identity
  theme: {
    colors: {
      primary: string                       // Deep blue
      secondary: string                     // Warm gold
      accent: string                        // Liturgical purple
      background: string                    // Soft cream/parchment
      surface: string                       // White
      text: string                          // Dark charcoal
      textSecondary: string                 // Warm gray
    }
    fontFamily: {
      heading: string                       // Serif (e.g., "Lora", "Merriweather")
      body: string                          // Clean sans-serif (e.g., "Inter", "Source Sans Pro")
    }
    borderRadius: 'rounded' | 'sharp'       // 'rounded' — warm and approachable
    iconStyle: 'outlined' | 'filled'        // 'outlined' — clean, formal
  }

  // Content Policy
  content: {
    ageRating: 'everyone'
    toneDirective: string                   // "Reverent, educational, warm. Never mocking or irreverent."
    requireScriptureRef: boolean            // true
    bannedCategories: string[]              // ['violence', 'romance', 'politics', 'horror', 'occult']
    denominationalPolicy: 'ecumenical'      // Avoid contentious theology
    defaultContentNamespace: string         // 'amen'
  }

  // Feature Flags
  features: {
    gameEditor: false                       // Users cannot create games
    userGeneratedContent: false             // All content is curated
    aiGeneration: false                     // No user-facing AI tools
    organizations: true                     // Church org subscriptions
    partyGamesOnly: true                    // Only show party games, not engine games
  }

  // Legal
  termsUrl: string                          // "https://amen.games/terms"
  privacyUrl: string                        // "https://amen.games/privacy"
  supportEmail: string                      // "support@amen.games"

  // Monetization
  monetization: {
    hasIndividualSub: boolean               // true
    hasOrgSub: boolean                      // true
    freeGamesPerWeek: number                // 2 — free users get 2 game sessions/week
    trialDays: number                       // 14
  }
}
```

---

## Backend — Multi-Tenant API

### Database Migration

```sql
-- =============================================================================
-- BRAND SYSTEM
-- =============================================================================

CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,                          -- 'slopcade', 'amen'
  slug TEXT NOT NULL UNIQUE,                    -- URL-safe identifier
  display_name TEXT NOT NULL,                   -- "Amen"
  domain TEXT,                                  -- "amen.games"
  config_json TEXT NOT NULL DEFAULT '{}',       -- Serialized BrandManifest overrides
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'archived')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Seed brands
INSERT OR IGNORE INTO brands (id, slug, display_name, domain, status, created_at, updated_at) VALUES
  ('slopcade', 'slopcade', 'Slopcade', 'slopcade.com', 'active', unixepoch()*1000, unixepoch()*1000),
  ('amen', 'amen', 'Amen', 'amen.games', 'active', unixepoch()*1000, unixepoch()*1000);

-- =============================================================================
-- BRAND SCOPING ON EXISTING TABLES
-- =============================================================================

-- Games: brand-scoped
ALTER TABLE games ADD COLUMN brand_id TEXT NOT NULL DEFAULT 'slopcade' REFERENCES brands(id);
CREATE INDEX IF NOT EXISTS idx_games_brand ON games(brand_id, is_public, created_at DESC);

-- Users: brand-scoped (users belong to ONE brand, never shared)
ALTER TABLE users ADD COLUMN brand_id TEXT NOT NULL DEFAULT 'slopcade' REFERENCES brands(id);
CREATE INDEX IF NOT EXISTS idx_users_brand ON users(brand_id);

-- Themes: brand-scoped
ALTER TABLE themes ADD COLUMN brand_id TEXT NOT NULL DEFAULT 'slopcade' REFERENCES brands(id);

-- =============================================================================
-- ORGANIZATION SYSTEM (Church Subscriptions)
-- =============================================================================

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES brands(id),
  name TEXT NOT NULL,                           -- "Grace Community Church"
  slug TEXT NOT NULL,                           -- "grace-community" (for join links)
  
  -- Admin
  admin_user_id TEXT NOT NULL REFERENCES users(id),
  
  -- Size & Tier
  size_tier TEXT NOT NULL DEFAULT 'small'
    CHECK (size_tier IN ('small', 'medium', 'large', 'mega')),
  reported_attendance INTEGER,                  -- Self-reported average attendance
  
  -- Join Mechanics
  join_code TEXT UNIQUE,                        -- 6-char alphanumeric: "GRACE7"
  join_link_enabled INTEGER NOT NULL DEFAULT 1, -- amen.games/join/grace-community
  
  -- Metadata
  denomination TEXT,                            -- Optional: "Catholic", "Baptist", etc.
  city TEXT,
  state TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'trial', 'suspended', 'cancelled')),
  trial_ends_at INTEGER,                        -- Null if not in trial
  
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  
  UNIQUE(brand_id, slug)                        -- Slugs unique within brand
);

CREATE INDEX IF NOT EXISTS idx_orgs_brand ON organizations(brand_id, status);
CREATE INDEX IF NOT EXISTS idx_orgs_join_code ON organizations(join_code);
CREATE INDEX IF NOT EXISTS idx_orgs_admin ON organizations(admin_user_id);

-- Organization Members
CREATE TABLE IF NOT EXISTS organization_members (
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('admin', 'leader', 'member')),
  joined_at INTEGER NOT NULL,
  invited_by TEXT REFERENCES users(id),
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(org_id, role);

-- Organization Subscriptions (linked to org, not individual user)
CREATE TABLE IF NOT EXISTS org_subscriptions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id),
  
  -- Billing
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  
  -- Plan Details
  plan_id TEXT NOT NULL,                        -- 'amen_church_small', 'amen_church_medium', etc.
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
  
  -- Period
  current_period_start INTEGER NOT NULL,
  current_period_end INTEGER NOT NULL,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  
  -- Limits
  max_members INTEGER,                          -- NULL = unlimited for tier
  
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_org_subs_org ON org_subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_org_subs_stripe ON org_subscriptions(stripe_subscription_id);
```

### tRPC Context Extension

```typescript
// api/src/trpc/context.ts
interface Context {
  // ...existing
  brandId: BrandId                          // From x-brand-id header, validated
  organizationId?: string                   // User's active org (if member of one)
  organizationRole?: 'admin' | 'leader' | 'member'
  hasOrgEntitlement: boolean                // Does user's org have active sub?
}
```

### Brand Resolution Flow

```
1. Client sends: x-brand-id: amen
2. API validates header against brands table
3. API sets ctx.brandId = 'amen'
4. All queries scoped: WHERE brand_id = ctx.brandId
5. Content packs resolved: amen:trivia, amen:quip, etc.
6. Feature flags checked: ctx.brand.features.gameEditor === false
```

### Content Loading (Brand-Aware)

```typescript
// api/src/party/content/prompt-loader.ts
// Resolution:
//   1. Look for "{brandId}:{packKey}" → "amen:trivia"
//   2. If not found and pack is in brand's allowedFallbacks → use default pack
//   3. Otherwise → error (no cross-brand content leakage)
```

---

## Frontend — Brand Variant System

### App Config (`app/app.config.ts`)

```typescript
import { getBrandManifest } from '@slopcade/brands'

const BRAND_ID = process.env.BRAND_ID || 'slopcade'
const brand = getBrandManifest(BRAND_ID)

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: brand.displayName,
  slug: brand.id,
  scheme: brand.scheme,
  
  ios: {
    ...config.ios,
    bundleIdentifier: brand.ios.bundleIdentifier,
  },
  android: {
    ...config.android,
    package: brand.android.package,
  },
  
  icon: `./assets/brands/${brand.id}/icon.png`,
  splash: {
    image: `./assets/brands/${brand.id}/splash.png`,
    resizeMode: 'contain',
    backgroundColor: brand.theme.colors.background,
  },
  
  extra: {
    ...config.extra,
    brandId: brand.id,
    brandTheme: brand.theme,
    supabaseUrl: brand.auth.supabaseUrl,
    supabaseAnonKey: brand.auth.supabaseAnonKey,
  },
})
```

### EAS Build Profiles (`app/eas.json`)

```json
{
  "build": {
    "development": {
      "env": { "BRAND_ID": "slopcade" }
    },
    "amen-development": {
      "env": { "BRAND_ID": "amen" }
    },
    "amen-preview": {
      "distribution": "internal",
      "env": { "BRAND_ID": "amen" }
    },
    "amen-production": {
      "distribution": "store",
      "autoIncrement": true,
      "env": { "BRAND_ID": "amen" }
    }
  },
  "submit": {
    "amen-ios": {
      "ios": { "ascAppId": "<TBD>", "appleTeamId": "<TBD>" }
    },
    "amen-android": {
      "android": { "track": "production", "serviceAccountKeyPath": "<TBD>" }
    }
  }
}
```

### Brand Bootstrap (Runtime)

```typescript
// app/lib/brand/index.ts
import Constants from 'expo-constants'
import { getBrandManifest, type BrandManifest } from '@slopcade/brands'

export const activeBrand: BrandManifest = getBrandManifest(
  Constants.expoConfig?.extra?.brandId ?? 'slopcade'
)

// Use throughout the app:
// activeBrand.displayName → "Amen"
// activeBrand.theme.colors.primary → "#1B3A6B"
// activeBrand.features.gameEditor → false
// activeBrand.content.toneDirective → "Reverent, educational..."
```

### Network Layer

```typescript
// app/lib/trpc.ts — brand header injection
headers: () => ({
  'x-brand-id': activeBrand.id,
  // ...existing headers
})
```

### UI Isolation Checklist

- [x] Replace all hardcoded "Slopcade" strings with `activeBrand.displayName`
- [x] Gate game editor UI behind `activeBrand.features.gameEditor`
- [x] Gate AI generation UI behind `activeBrand.features.aiGeneration`
- [x] Hide "Create Game" flows when `activeBrand.features.userGeneratedContent === false`
- [x] Show only party games when `activeBrand.features.partyGamesOnly === true`
- [x] Apply brand-specific Terms/Privacy URLs from manifest
- [x] No cross-brand links, logos, or legal references anywhere in the UI
- [x] Brand-specific app store review URL
- [x] Brand-specific support/contact email

---

## Account Isolation & Auth

### Complete Isolation via Separate Supabase Projects

Users of amen.games must have **zero connection** to Slopcade. This means:

| Aspect | Slopcade | amen.games |
|--------|----------|------------|
| Supabase project | Existing project (`bqoepxmdaiggnwjjszsd`) | **New project** (TBD) |
| Auth providers | Google OAuth | Google OAuth + Apple Sign-In + Email/Password |
| User table | `users` with `brand_id = 'slopcade'` | `users` with `brand_id = 'amen'` |
| OAuth redirect | `slopcade://auth-callback` | `amen://auth-callback` |
| JWT issuer | Slopcade Supabase URL | Amen Supabase URL |

**Why separate Supabase projects (not just brand_id filtering)?**
- A Slopcade user's email would show up as "taken" on amen.games signup
- OAuth tokens from one brand's Google client would work on the other
- Password reset emails would come from the wrong domain
- True isolation requires separate auth infrastructure

### Auth Provider Selection for amen.games

| Provider | Why |
|----------|-----|
| Google OAuth | Standard. Most people have Gmail. |
| Apple Sign-In | Required by App Store if you offer any social login. |
| Email/Password | Church members (especially older congregants) may not use Google/Apple. Email+password is the most accessible. |

### API-Side Brand Validation

```typescript
// api/src/trpc/index.ts — brand-aware auth
// 1. Extract brandId from x-brand-id header
// 2. Validate Supabase JWT against the CORRECT Supabase project for that brand
// 3. Verify user.brand_id === ctx.brandId (defense in depth)
// 4. Reject if mismatch
```

The API stores Supabase credentials per brand in its environment config (Cloudflare Workers secrets). When validating a JWT, it selects the correct Supabase client based on the brand header.

---

## Organization & Church Subscriptions

### Model: Attendance-Based Flat Tiers

Following the church SaaS industry standard (RightNow Media, Ministry Grid, Kahoot EDU), pricing is **flat rate by church size**, not per-seat.

### Pricing Tiers

| Tier | Church Size | Annual Price | Monthly Price | Includes |
|------|------------|-------------|--------------|----------|
| **Small** | Up to 100 avg attendance | $199/year | $24/month | Unlimited members, all games, basic analytics |
| **Medium** | 101-500 avg attendance | $499/year | $59/month | Everything in Small + priority support, custom join page |
| **Large** | 501-2,000 avg attendance | $999/year | $119/month | Everything in Medium + dedicated success contact, usage reports |
| **Mega** | 2,000+ avg attendance | Custom | Custom | Enterprise features, multi-campus support, API access |

### Individual Pricing

| Tier | Price | Includes |
|------|-------|----------|
| **Free** | $0 | 2 game sessions per week, ads between games |
| **Amen+** | $4.99/month or $39.99/year | Unlimited games, no ads, access to all game types |

### How Members Join an Organization

**Three methods, zero friction:**

1. **Join Link** (Primary): Admin shares `amen.games/join/grace-community`. User clicks, signs up (or logs in), auto-joined to the org.

2. **Join Code** (For verbal sharing): Admin reads out a 6-character code (e.g., `GRACE7`). User enters it in Settings → "Join Church". Works great for announcements from the pulpit.

3. **Admin Invite** (For leaders): Admin enters email addresses in the org dashboard. Users receive an email invitation with a direct join link.

### Member Entitlement Flow

```
User logs in
  → API checks organization_members for user
    → If member of org with active subscription:
        hasOrgEntitlement = true → unlimited access, no individual billing
    → If not a member of any org:
        Check individual subscription (Stripe/RevenueCat)
          → If subscribed: full access
          → If free: 2 sessions/week, ads
```

### Admin Dashboard Features

| Feature | Description |
|---------|-------------|
| Member Directory | List of all members, join date, last active |
| Usage Analytics | Games played this week/month, most popular games, peak times |
| Join Management | Generate/regenerate join code, toggle join link, manage invites |
| Billing | View/update subscription, download invoices (church treasurers need this) |
| Content Preferences | Optional: mark certain game types as preferred for their congregation |

### Billing Implementation

- **Stripe Checkout** for web-based org subscriptions (churches will sign up on desktop, not mobile)
- **Stripe Customer Portal** for self-service billing management
- **Stripe Webhooks** → update `org_subscriptions` status
- **No RevenueCat for org subs** — orgs subscribe via web, not App Store IAP (avoids 30% Apple tax)
- Individual subscriptions still use RevenueCat (iOS) + Stripe (web)

---

## Monetization Model

### Revenue Streams

| Stream | Target | Mechanism |
|--------|--------|-----------|
| Church annual subscriptions | Youth pastors, family ministry | Stripe (web checkout) |
| Individual Amen+ subscriptions | Families, individuals | RevenueCat (iOS/Android) + Stripe (web) |
| Seasonal content packs | All users | One-time IAP (e.g., "Easter Special Pack" $2.99) |

### Unit Economics (Projection)

| Metric | Conservative | Optimistic |
|--------|-------------|------------|
| Churches subscribed (Year 1) | 50 | 200 |
| Avg church tier | Small ($199/yr) | Medium ($499/yr) |
| Church ARR | $9,950 | $99,800 |
| Individual subscribers | 500 | 2,000 |
| Individual ARR ($40/yr) | $20,000 | $80,000 |
| **Total Year 1 ARR** | **$29,950** | **$179,800** |

### Free Tier Strategy

The free tier exists to:
1. Let youth pastors **try before buying** (critical for church procurement)
2. Let individual members experience games so they **ask their church to subscribe**
3. Build word-of-mouth through organic sharing

Free users get 2 game sessions per week — enough to experience value, not enough for regular use.

---

## Content Generation Pipeline

### Denominational Content Strategy

**Ecumenical approach**: Content that is safe for ALL major Christian denominations.

#### Green Zone (Universally Safe)

| Category | Examples |
|----------|---------|
| Old Testament narratives | Noah's Ark, David & Goliath, Exodus, Daniel in the lion's den |
| Life of Jesus | Parables, miracles, Sermon on the Mount, birth narrative, ministry |
| Psalms & Proverbs | Wisdom literature, famous psalms (23, 91, 119) |
| Acts of the Apostles | Paul's journeys, Pentecost, early church |
| Biblical geography | Jerusalem, Bethlehem, Sea of Galilee, Egypt, Rome |
| Church history (consensus) | Constantine, Reformation (factual), missionary movements |
| Christian virtues | Faith, hope, love, mercy, justice, compassion |
| Ten Commandments | Universal across denominations |
| Lord's Prayer | Universal across denominations |
| Christmas & Easter | Core narratives (not denominational traditions around them) |

#### Red Zone (AVOID — Denominationally Contentious)

| Topic | Why It's Divisive |
|-------|------------------|
| Predestination vs. free will | Calvinist/Arminian split |
| Baptism method (immersion vs. sprinkling) | Baptist/Methodist/Catholic split |
| Eucharist/Communion theology | Transubstantiation vs. symbolic — massive divide |
| Veneration of Mary | Catholic/Orthodox vs. Protestant |
| Veneration of saints | Catholic vs. Protestant |
| Speaking in tongues | Charismatic vs. Cessationist |
| End times / Rapture | Pre-trib, post-trib, amillennial — deeply divisive |
| Papal authority | Catholic vs. everyone else |
| Ordination of women | Progressive vs. traditional denominations |
| Creation timeline | Young Earth vs. Old Earth vs. Theistic Evolution |

#### Yellow Zone (Handle With Care)

| Topic | How to Handle |
|-------|--------------|
| Saints | Include as historical figures and biblical characters, not as objects of veneration |
| Sacraments | Reference factually ("Christians practice baptism") without specifying method |
| Liturgical calendar | Include major seasons (Advent, Lent, Easter) as cultural touchpoints |
| Reformation | Present as historical fact, not as "correction" of Catholicism |

### Content Sources to Ingest

| Source | What We Get | Priority |
|--------|------------|----------|
| **API.Bible** (ABS) | Scripture text, 2,500+ translations, verse lookup | P0 — foundation |
| **BibleQuizzle** (GitHub) | 500+ pre-made trivia Q&A with scripture refs | P0 — immediate seed data |
| **Theographic Bible Metadata** | Knowledge graph: people, places, relationships, timelines | P0 — powers "who/what/when" games |
| **BradyStephenson Bible Data** | Structured JSON of every biblical person | P0 — character-based games |
| **Bible Trivia Alpaca** (HuggingFace) | 1.29k instruction-tuned trivia rows | P1 — augment trivia |
| **Church Calendar API** (calapi) | Liturgical calendar, feast days | P1 — seasonal content |
| **OpenBible Cross-References** | 340k+ verse connections | P2 — "Connection" game content |
| **OpenBible Geocoding** | Lat/long for every Bible place | P2 — geography games |

### Generation Targets

| Content Type | Game(s) | Target Count | Generation Method |
|-------------|---------|-------------|-------------------|
| Bible trivia (MCQ) | Quickfire Q&A | 4,000 | Ingest BibleQuizzle + AI expand |
| Fill-in-blank prompts | Quiplash, Crowd Comedy | 3,000 | AI generate with scripture grounding |
| Obscure Bible facts (Fibbage) | Truth Trap | 1,500 | AI generate from Theographic data |
| Biblical history events + years | Year Jinx | 700 | AI generate from timeline data |
| Drawing prompts (Bible scenes) | Drawful Animate, Sketch Bluff | 1,000 | AI generate from narrative data |
| Ranking/poll categories | Consensus Mine | 800 | AI generate (e.g., "Rank these disciples...") |
| Moral dilemma scenarios | Half and Half | 500 | AI generate with ethical grounding |
| Bible character clue categories | Heads Up | 500 | Generate from character database |
| Faith testimony prompts | About You Bluff | 300 | AI generate |
| Bible character traits | Role Replay | 200 | Generate from character database |
| **TOTAL** | | **~12,500** | |

### Generation Pipeline Extension

```typescript
// packages/content-pipeline/src/generate/prompts.ts

const AMEN_SYSTEM_PREFIX = `You are generating content for Amen, a reverent and educational 
Christian party game platform designed for church groups, youth groups, and family game nights.

ALL content MUST:
- Be theologically accurate and grounded in scripture
- Include a scripture reference (book chapter:verse) when applicable
- Be respectful and reverent toward Christian faith and traditions
- Be suitable for all ages, including children present at church events
- Be ecumenical — welcoming to Catholics, Protestants, and Orthodox Christians
- NEVER mock, trivialize, or make light of sacred topics
- NEVER take sides on denominationally contentious issues
- Be educational and enriching, not just entertaining
- Use warm, encouraging language — never preachy or condescending

FORBIDDEN content:
- Violence, horror, or frightening imagery
- Romance or sexual content of any kind
- Political topics or partisan positions
- Occult, witchcraft, or new age references
- Content that could be seen as disrespectful to any Christian tradition
- Jokes that punch down at any group of people`

const AMEN_TRIVIA: GameTypeConfig = {
  schema: z.object({
    items: z.array(TriviaItemSchema.extend({
      scriptureRef: z.string(),           // e.g., "Genesis 6:14"
      explanation: z.string(),            // Brief explanation of the correct answer
    }))
  }),
  system: AMEN_SYSTEM_PREFIX + `
Generate multiple-choice Bible trivia questions. Each question should:
- Test knowledge of scripture, biblical history, or Christian tradition
- Have exactly 1 correct answer and 3 plausible incorrect answers
- Include the specific scripture reference where the answer can be found
- Include a brief explanation that teaches something, not just confirms the answer
- Vary in difficulty from easy (suitable for children) to challenging (for Bible scholars)`,
  promptTemplate: (count) =>
    `Generate ${count} Bible trivia questions across these categories: 
    Old Testament narratives, New Testament/Gospels, Acts & Epistles, 
    Biblical geography, Biblical figures, Psalms & Proverbs, 
    Parables of Jesus, Miracles, Ten Commandments, Church history.
    Mix difficulties: 40% easy, 40% medium, 20% hard.`,
}

// Similar configs for: amen-quip, amen-fibbage, amen-drawing, amen-history, etc.
```

### Quality Assurance Pipeline

```
Step 1: AI Generation (OpenRouter — GPT-4o / Claude)
  ↓
Step 2: Automated Checks
  - Scripture reference validation (does the verse exist? via API.Bible)
  - Profanity/toxicity filter
  - Duplicate detection (content hash + semantic similarity)
  - Red Zone topic detection (keyword + semantic check for contentious theology)
  - Age suitability check
  ↓
Step 3: AI Theological Review
  - Second-pass LLM review: "Is this content ecumenically safe?"
  - Flag items that mention Red Zone topics for manual review
  - Verify factual accuracy of trivia answers
  ↓
Step 4: Human QA (outsourced or volunteer)
  - Theology-literate reviewer scans flagged items
  - Spot-check 10% random sample of auto-approved items
  - Final approval before content enters production packs
```

---

## Game Selection & Theming

### Tier 1 — Launch Games (8 games)

| # | Game | Original Theme | Amen Theme | Content Pack |
|---|------|---------------|------------|-------------|
| 1 | **Quickfire Q&A** | "High-tech research facility" | "The Great Hall of Wisdom" — stained glass, warm library | `amen:trivia` |
| 2 | **Quiplash** | Generic comedy | "The Fellowship Table" — warm gathering, breaking bread | `amen:quip` |
| 3 | **Truth Trap** | "Historical revisionism" | "Scrolls of Truth" — ancient scrolls, candlelight | `amen:fibbage` |
| 4 | **Year Jinx** | "Stabilize the timeline" | "The Book of Ages" — illuminated manuscript timeline | `amen:history` |
| 5 | **Consensus Mine** | "Hive Mind in the mines" | "The Council" — gathering of disciples, consensus | `amen:ranking` |
| 6 | **Half and Half** | "Futuristic Neutral Zone" | "The Crossroads" — ethical decision point, warm lighting | `amen:dilemma` |
| 7 | **Drawful Animate** | Generic drawing | "Illustrated Scripture" — draw Bible scenes | `amen:drawing` |
| 8 | **Heads Up** | Generic word guessing | "Who Am I?" — guess the Bible character | `amen:headsup` |

### Tier 2 — Post-Launch (add within 2 weeks of launch)

| # | Game | Amen Theme | Content Pack |
|---|------|------------|-------------|
| 9 | **About You Bluff** | "Testimony Circle" — share faith stories | `amen:testimony` |
| 10 | **Role Replay** | "Walk in Their Sandals" — become Bible characters | `amen:characters` |
| 11 | **Sketch Bluff** | "The Illustrated Word" — draw and bluff | `amen:drawing` |
| 12 | **Ruin and Redeem** | Already has divine court theme — perfect fit! | `amen:quip` |

### Game Re-theming Approach

Each game needs:
1. **Content pack**: Brand-namespaced JSON file with themed content
2. **Title**: New name that fits the amen.games tone (warm, inviting, slightly formal)
3. **Description**: Re-written to reflect the faith context
4. **Instructions**: Re-written for church group context
5. **Visual theme** (future): Color overrides and background imagery per game

For launch, items 1-4 are essential. Item 5 (visual theme per game) can come post-launch.

---

## Content Tone & Guidelines

### Voice Principles

| Principle | Example |
|-----------|---------|
| **Warm, not cold** | "Welcome to the Fellowship Table!" not "ENTER THE ARENA" |
| **Educational, not preachy** | "Did you know? The Sea of Galilee is actually a freshwater lake!" not "You should read your Bible more" |
| **Reverent, not solemn** | Fun and engaging, but never mocking sacred topics |
| **Inclusive, not exclusive** | "Christians celebrate..." not "True Christians believe..." |
| **Encouraging, not competitive** | "Great answer!" not "DESTROYED!" |
| **Family-friendly always** | No content that a pastor would be uncomfortable showing on screen |

### Comparison: Slopcade vs amen.games

| Aspect | Slopcade | amen.games |
|--------|----------|------------|
| Tone | Irreverent, chaotic, absurd | Reverent, warm, educational |
| Humor style | Edgy, pop culture, internet humor | Clean, clever, wholesome |
| Prompts | "The worst superhero name: ____" | "Moses' excuse for being late to the burning bush: ____" |
| Victory text | "CHAMPION!" with explosion effects | "Well done, good and faithful servant!" |
| Losing text | "ELIMINATED" | "The race isn't over yet!" |
| Colors | Neon, dark, high-contrast | Gold, deep blue, warm cream |
| Typography | Bold sans-serif, playful | Elegant serif headings, clean body |
| Imagery | Glitch effects, pixel art | Stained glass motifs, warm illustrations |
| Sound | Electronic, arcade | Gentle chimes, warm tones |

### Content Review Rubric

Every piece of generated content is scored on:

| Criterion | Pass | Fail |
|-----------|------|------|
| Theological accuracy | Fact is correct, scripture ref is valid | Misquotes scripture, wrong attribution |
| Denominational safety | Safe for all major denominations | Takes sides on contentious issue |
| Tone | Warm, respectful, engaging | Mocking, preachy, condescending, or boring |
| Age appropriateness | Suitable for ages 8+ | References violence, romance, or mature themes |
| Fun factor | Would spark discussion or laughter in a group | Feels like a homework assignment |

---

## Visual Identity & Assets

### Brand Kit

| Element | Specification |
|---------|--------------|
| **Name** | Amen |
| **Domain** | amen.games |
| **Tagline** | "Scripture. Fellowship. Fun." |
| **Primary color** | Deep blue (#1B3A6B) — trust, depth, devotion |
| **Secondary color** | Warm gold (#C9A84C) — sacred, illumination, warmth |
| **Accent color** | Liturgical purple (#6B3FA0) — Advent/Lent seasons |
| **Background** | Soft cream (#FDF8F0) — parchment warmth |
| **Surface** | Clean white (#FFFFFF) |
| **Text** | Dark charcoal (#2D2D2D) |
| **Error/alert** | Muted red (#B84233) |
| **Success** | Olive green (#5B7F3B) |
| **Heading font** | Serif (Lora or Merriweather) — classic, readable, respectful |
| **Body font** | Sans-serif (Inter or Source Sans Pro) — clean, modern, accessible |
| **Icon style** | Outlined, clean lines — not playful/cartoonish |
| **Imagery** | Stained glass motifs, warm illustrations, illuminated manuscript elements |
| **Logo** | "amen" in lowercase serif with a subtle cross integrated into the 't' of a tagline, or a simple dove mark |

### App Store Assets Required

| Asset | Spec | Status |
|-------|------|--------|
| iOS App Icon | 1024x1024 PNG | TODO |
| Android Adaptive Icon (foreground) | 108x108dp (432x432px) | TODO |
| Android Adaptive Icon (background) | Solid color or pattern | TODO |
| Splash Screen | 1284x2778 (iPhone 14 Pro Max) | TODO |
| iOS Store Screenshots (6.5") | 1290x2796 (×6 screens) | TODO |
| iOS Store Screenshots (5.5") | 1242x2208 (×6 screens) | TODO |
| Android Phone Screenshots | 1080x1920 (×6 screens) | TODO |
| Android Feature Graphic | 1024x500 | TODO |
| App Preview Video | 15-30s, 1080p | TODO (post-launch OK) |

### Store Listing Copy (Draft)

**App Name**: Amen — Bible Party Games

**Subtitle** (iOS, 30 chars): Scripture. Fellowship. Fun.

**Short Description** (Android, 80 chars): Play Bible trivia, drawing games, and more with your church group or family!

**Description**:
> Amen brings your church group, youth group, or family together for unforgettable game nights grounded in scripture.
>
> Play 8+ party games designed for groups of 2-12 players. Test your Bible knowledge with trivia, draw your favorite scripture scenes, guess Bible characters, and discover surprising facts from the Word.
>
> Whether it's a Wednesday night youth group, a Sunday school class, or a family gathering after dinner — Amen makes fellowship fun.
>
> GAMES INCLUDE:
> - The Great Hall of Wisdom — Fast-paced Bible trivia
> - The Fellowship Table — Fill-in-the-blank fun with Bible themes
> - Scrolls of Truth — Discover surprising Bible facts
> - The Book of Ages — Guess when biblical events happened
> - Illustrated Scripture — Draw Bible scenes and guess
> - Who Am I? — Guess the Bible character
> - The Crossroads — Navigate moral dilemmas together
> - The Council — Rank and discuss Bible topics
>
> PERFECT FOR:
> - Youth group game nights
> - Family devotion time
> - Bible study icebreakers
> - Church retreats and lock-ins
> - VBS activities
> - Small group fellowship
>
> CHURCH PLANS AVAILABLE:
> Subscribe your whole church and give every member unlimited access. Visit amen.games for details.
>
> All content is reviewed for theological accuracy and designed to be welcoming to all Christian traditions.

**Keywords** (iOS): bible,trivia,church,youth group,party game,christian,family,fellowship,scripture,game night

**Category**: Games → Trivia (primary), Education (secondary)

---

## Timeline — 7 Weeks to Easter

### Week 1: Feb 16-22 — Foundation

**Lane A (Backend)**
- [x] Create DB migration: brands, organizations, org_members, org_subscriptions tables
- [x] Add brand_id to users, games, themes tables
- [ ] Create new Supabase project for amen.games
- [x] Wire brand resolution in tRPC context

**Lane B (Frontend)**
- [x] Create `packages/brands/` with types, manifests, registry
- [x] Wire `BRAND_ID` into `app.config.ts`
- [x] Create `app/assets/brands/amen/` directory structure
- [x] First pass: audit all hardcoded "Slopcade" strings in app

**Lane C (Content)**
- [x] Set up content pipeline adapters for API.Bible + BibleQuizzle
- [ ] Ingest BibleQuizzle trivia dataset (~500 items)
- [ ] Ingest Theographic Bible character/place data
- [ ] Begin AI generation: 2,000 trivia questions
- [ ] Begin AI generation: 1,000 quip prompts
- [x] Define content review rubric and Red/Yellow/Green zone guidelines

**Lane D (GTM)**
- [x] Lock brand name, tagline, color palette (DONE — amen.games)
- [ ] Register App Store Connect app + Google Play Console listing
- [ ] Commission app icon and splash screen design
- [x] Set up amen.games landing page (simple "Coming Easter 2026" + email capture)

### Week 2: Feb 23 - Mar 1 — Integration

**Lane A (Backend)**
- [x] Complete tRPC brand-scoped routing (all list/read endpoints filtered)
- [x] Wire brand-aware content pack loading
- [x] Create organization CRUD endpoints (create org, join, leave, manage)
- [x] Set up Stripe products for church subscription tiers

**Lane B (Frontend)**
- [x] Create amen.games theme tokens (colors, fonts, border radii)
- [x] Apply brand theme via CSS variable overrides in global.css
- [x] Replace hardcoded strings with `activeBrand.*` references
- [x] Add EAS build profiles for amen brand
- [x] Gate game editor / AI features behind feature flags
- [ ] **First internal build of amen.games app variant**

**Lane C (Content)**
- [ ] Continue generation: target 5,000 total items
- [ ] Generate drawing prompts (500), fibbage facts (500), history events (300)
- [ ] Run automated moderation on all generated content
- [ ] Begin scripture reference validation (API.Bible lookup)
- [x] Wire first content packs to Tier 1 games for testing

**Lane D (GTM)**
- [ ] Finalize app icon, splash screen, store assets
- [x] Write store listing copy (description, keywords, category)
- [ ] Set up social media accounts (@amengames on Instagram, TikTok, X)
- [ ] Identify 10-20 youth pastor influencers for outreach

### Week 3: Mar 2-8 — Content Depth + App Review

**Lane A (Backend)**
- [x] Organization join flow (join link + join code)
- [x] Org entitlement checking (member of org with active sub → full access)
- [x] Stripe webhook integration for org subscriptions
- [x] Individual subscription support (RevenueCat + Stripe)

**Lane B (Frontend)**
- [x] Organization join UI (enter code / deep link handling)
- [x] Organization admin dashboard (member list, usage stats, billing)
- [x] Free tier rate limiting UI (show "2 of 2 free sessions used this week")
- [ ] **Submit to App Store / Play Store review** (allow 3-5 days for review)

**Lane C (Content)**
- [ ] Complete generation for all Tier 1 packs (~10,000 items total)
- [ ] Full automated moderation pipeline run
- [ ] AI theological review pass on all content
- [ ] Begin human QA review (outsource or recruit volunteer reviewers)
- [ ] Package and deploy all Tier 1 content packs

**Lane D (GTM)**
- [ ] Upload store screenshots and metadata
- [ ] Record/create app preview video (can be simple screen capture)
- [ ] Begin outreach to youth pastor network (email, DMs, Facebook groups)

### Week 4: Mar 9-15 — Polish + Pilot

**Lane A (Backend)**
- [ ] Bug fixes from testing
- [ ] Performance testing with concurrent party game sessions
- [x] Rate limiting and abuse prevention for free tier

**Lane B (Frontend)**
- [x] UI polish: animations, loading states, error handling
- [ ] Test all 8 Tier 1 games end-to-end with real content
- [x] Accessibility check (font sizes, contrast ratios, screen reader)
- [ ] Fix any App Store review feedback

**Lane C (Content)**
- [ ] Complete human QA review
- [ ] Fix/replace any flagged content items
- [ ] Begin Tier 2 game content generation (if capacity allows)
- [x] Create "Easter Special" content pack (Holy Week themed)

**Lane D (GTM)**
- [ ] **Pilot test with 3-5 church/family groups** (recruit from personal network + online communities)
- [ ] Collect feedback: content quality, UI clarity, game flow, fun factor
- [ ] Iterate based on pilot feedback

### Week 5: Mar 16-22 — Content Freeze + Marketing Push

**Lane A (Backend)**
- [ ] Production environment finalized (monitoring, error tracking, alerting)
- [ ] Scaling check: can Cloudflare Workers handle projected load?
- [x] Final security review: brand isolation, data leakage prevention

**Lane B (Frontend)**
- [ ] Content freeze for v1 core packs
- [ ] Finalize all store screenshots and preview video
- [ ] Release candidate build submitted

**Lane C (Content)**
- [ ] Content freeze — no new content after this week
- [ ] Final review of all deployed packs
- [ ] Easter Special pack finalized and staged for Holy Week

**Lane D (GTM)**
- [ ] Marketing landing page live at amen.games (features, pricing, signup)
- [ ] Begin organic social media content (Bible trivia clips, game previews)
- [ ] Outreach to Christian bloggers, podcasters, and media outlets
- [x] Create "Church Starter Kit" — PDF guide for pastors on how to use the app

### Week 6: Mar 23-29 — Holy Week Prep

**Lane A (Backend)**
- [ ] Production readiness: load testing, failover, backup verification
- [ ] Monitoring dashboards for launch day (error rates, signup velocity, game sessions)

**Lane B (Frontend)**
- [ ] Final build approved on App Store + Play Store
- [x] Deep link testing: join codes, join links, universal links

**Lane C (Content)**
- [ ] Easter Special content pack deployed (activate Holy Monday)
- [ ] "Daily Scripture" feature for Holy Week (optional engagement hook)

**Lane D (GTM)**
- [ ] Distribute press/influencer kits (app promo codes, screenshots, talking points)
- [ ] Partner churches announce amen.games to their congregations
- [ ] Holy Week social media campaign: daily Bible trivia clips
- [ ] Email blast to waitlist: "Amen launches this Easter!"

### Week 7: Mar 30 - Apr 5 — LAUNCH

**Mon-Thu (Holy Week)**
- [ ] Soft launch to pilot group and early adopters
- [ ] Daily featured game highlighting Holy Week themes
- [ ] Monitor crash rates, error rates, user feedback
- [ ] Hotfix window: rapid response to any critical issues

**Friday (Good Friday)**
- [ ] Reflective content: Passion narrative trivia, crossroads moral dilemmas
- [ ] Marketing: "This Easter, bring your church together for game night"

**Sunday (Easter — April 5)**
- [ ] **FULL PUBLIC LAUNCH**
- [ ] Easter-themed content front and center
- [ ] Social media push: "He is risen! Celebrate with your church tonight"
- [ ] Monitor KPIs: downloads, signups, game sessions, org registrations

**Post-Launch (Week of April 6)**
- [ ] Monitor retention metrics (Day 1, Day 3, Day 7)
- [ ] Collect and respond to App Store reviews
- [ ] Deploy Tier 2 games if content is ready
- [ ] Retrospective: what worked, what didn't, what's next

---

## Go-to-Market Strategy

### Positioning

**One-liner**: "Jackbox Games for church groups"

**Elevator pitch**: "Amen is a party game app where your youth group, Bible study, or family plays Bible trivia, drawing games, and more together. It's designed to be fun, educational, and respectful of your faith. Churches can subscribe to give their whole congregation access."

### Target Buyers (in order of priority)

| Priority | Role | Why | How to Reach |
|----------|------|-----|-------------|
| 1 | **Youth Pastors** | Earliest tech adopters in churches, always looking for engagement tools | Facebook groups ("Youth Pastors Only"), Instagram DMs, conferences |
| 2 | **Family Ministry Directors** | Program family events, need group activities | Church staff directories, denominational networks |
| 3 | **Parents / Homeschool Families** | Want faith-based alternatives to secular entertainment | Homeschool Facebook groups, Christian parenting blogs |
| 4 | **Executive Pastors** | Control the budget, approve software purchases | Cold email with ROI angle ("engagement tool for $199/year") |

### Marketing Channels

| Channel | Cost | Timeline | Expected Impact |
|---------|------|----------|----------------|
| **Organic social media** (IG, TikTok, X) | Free | Ongoing from Week 3 | Brand awareness, shareable Bible trivia clips |
| **Youth pastor Facebook groups** | Free | Week 4-5 | Direct access to buyers, word-of-mouth |
| **Christian blogger/podcaster outreach** | Free (product) | Week 5-6 | Reviews, features, audience reach |
| **amen.games landing page + email capture** | $0-50/mo (hosting) | Week 1 (coming soon), Week 5 (full) | Waitlist, conversion funnel |
| **Church partner program** | Free (free year for early partners) | Week 4+ | Case studies, testimonials, word-of-mouth |
| **FrontGate Media** (paid — future) | $5k-20k | Post-launch if traction | Targeted reach to "Christian power users" |

### Launch Promotion

- **Free 14-day trial** for all church org subscriptions (no credit card required)
- **"Founding Church" discount**: First 50 churches get 50% off Year 1 ($99 instead of $199 for small tier)
- **Easter Game Night Kit**: Free downloadable PDF with game night planning guide, scripture readings, and discussion questions to pair with each game

### Key Metrics to Track

| Metric | Target (Week 1) | Target (Month 1) |
|--------|-----------------|-------------------|
| App downloads | 500 | 3,000 |
| Registered users | 200 | 1,500 |
| Game sessions played | 100 | 1,000 |
| Org registrations | 10 | 50 |
| Paid org subscriptions | 3 | 15 |
| Individual paid subs | 20 | 100 |
| App Store rating | 4.5+ | 4.5+ |
| Day 7 retention | 30% | 30% |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **App Store rejection** ("template app" policy) | Medium | High | Materially different UI, unique visual identity, distinct store metadata, different content |
| **Theological inaccuracy** in generated content | Medium | High | Scripture ref validation, Red Zone detection, AI review + human QA |
| **Timeline too aggressive** for Easter | Medium | High | Focus on Tier 1 only, reduce content targets by 50% if needed, launch with 4 games minimum |
| **Content feels like homework** — not fun | Medium | Medium | Playtest with real groups, prioritize "would a youth group laugh at this?" test |
| **Cross-brand data leakage** | Low | Critical | Separate Supabase projects, server-side brand enforcement, audit logging |
| **Apple 30% cut** on org subscriptions | Medium | Medium | Org subs via web/Stripe only (not IAP), individual subs via IAP |
| **Low initial adoption** | Medium | Medium | Free tier + generous trial removes friction, Founding Church discount creates urgency |
| **Denominational backlash** (content favors one tradition) | Low | High | Strict ecumenical guidelines, Red Zone topic list, human theological review |
| **Competitor launches first** | Low | Medium | No direct competitor exists in this space. Speed is good but quality matters more. |

---

## Appendix A: Parallel Execution Lanes

```
         Week 1      Week 2      Week 3      Week 4      Week 5      Week 6      Week 7
         ────────    ────────    ────────    ────────    ────────    ────────    ────────
Lane A   DB migr.    tRPC scope  Org billing Bug fixes   Prod ready  Load test   Launch ops
Backend  Brand ctx   Content LD  Stripe wh   Perf test   Security    Monitor     Monitor

Lane B   brands pkg  Theme tok   Org UI      UI polish   Screenshots Final build LAUNCH
Frontend app.config  First build Store sub   A11y check  RC build    Deep links  Easter UI

Lane C   Adapters    Gen cont.   Gen 10k     Human QA    Content     Easter pk   Easter
Content  Ingest seed First packs Full packs  Fix flags   freeze      Deploy      content

Lane D   Brand lock  Store setup Screenshots Pilot test  Landing pg  Press kits  LAUNCH
GTM      Landing pg  Social acct Store meta  Feedback    Social mktg Partners    Full push
```

## Appendix B: Database Schema Changes Summary

| Table | Change | Purpose |
|-------|--------|---------|
| `brands` | NEW | Brand registry |
| `users` | ADD `brand_id` | User belongs to one brand |
| `games` | ADD `brand_id` | Games scoped to brand |
| `themes` | ADD `brand_id` | Visual themes scoped to brand |
| `organizations` | NEW | Church/group entities |
| `organization_members` | NEW | User ↔ org membership |
| `org_subscriptions` | NEW | Stripe subscription per org |

## Appendix C: Content Pack Naming Convention

```
Format: {brandId}:{contentType}
Examples:
  slopcade:quip         — Slopcade's default quip prompts
  slopcade:trivia       — Slopcade's general trivia
  amen:quip             — Amen's Bible-themed quip prompts
  amen:trivia           — Amen's Bible trivia
  amen:fibbage          — Amen's Bible facts for Truth Trap
  amen:history          — Amen's Biblical history events
  amen:drawing          — Amen's Bible scene drawing prompts
  amen:ranking          — Amen's Bible topic rankings
  amen:dilemma          — Amen's moral dilemma scenarios
  amen:headsup          — Amen's Bible character categories
  amen:testimony        — Amen's faith testimony prompts (Tier 2)
  amen:characters       — Amen's Bible character traits (Tier 2)
  amen:easter-special   — Seasonal: Holy Week content pack
```
