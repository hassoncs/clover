# White-Label Platform: Christian Party Games

> **Target**: Easter 2026 (April 5) launch of a Christian-themed party game brand
> **Strategy**: Same backend, different branded frontends — first white-label customer
> **Status**: Planning

---

## Executive Summary

Re-skin and re-theme the Slopcade party game platform as a Christian party game brand. All content (trivia, prompts, drawing subjects, facts) reoriented around Christianity, Catholicism, and the Bible. Users of the Christian app see no connection to Slopcade. Both brands share one API, one database, one codebase.

---

## Architecture Decisions

### Build-time vs Runtime: Hybrid Approach

| Layer | Strategy | What It Controls |
|-------|----------|-----------------|
| **Build-time** | `BRAND_ID` env var in `app.config.ts` | App name, bundle ID, icon, splash, deep-link scheme, store listing |
| **Runtime** | `x-slopcade-brand` header + `ctx.brandId` | Content filtering, theme tokens, feature flags, copy/tone |

### Repo Structure (No Separate Packages Per Brand)

```
packages/brands/
  src/
    types.ts              # BrandId, BrandManifest, BrandTheme types
    manifests/
      slopcade.ts         # Default brand config
      christian-party.ts  # Christian brand config
    index.ts              # getBrandManifest(), DEFAULT_BRAND, brand registry

app/assets/brands/
  slopcade/               # Current icons/splash (move from app/assets/)
    icon.png
    adaptive-icon.png
    splash.png
    favicon.png
  christian-party/
    icon.png
    adaptive-icon.png
    splash.png
    favicon.png
```

### Brand Manifest Shape

```typescript
interface BrandManifest {
  id: BrandId
  displayName: string                    // "FaithFrenzy Party"
  slug: string                           // "faithfrenzy"
  tagline: string                        // "Game Night for the Faithful"
  
  // App Store identity
  ios: { bundleIdentifier: string }      // "com.faithfrenzy.app"
  android: { package: string }           // "com.faithfrenzy.app"
  scheme: string                         // "faithfrenzy"
  
  // Visual theming
  theme: {
    colors: Record<string, string>       // CSS variable overrides
    fontFamily?: string
  }
  
  // Content policy
  content: {
    ageRating: 'everyone' | 'teen'
    requireScriptureRef: boolean         // true for Christian brand
    bannedCategories: string[]           // e.g., ['romance', 'violence']
    defaultContentPacks: string[]        // brand-specific pack keys
  }
  
  // Legal
  termsUrl: string
  privacyUrl: string
  
  // Feature flags
  features: {
    gameEditor: boolean                  // false for Christian brand initially
    userGeneratedContent: boolean        // false initially
    aiGeneration: boolean                // false — curated only
  }
}
```

---

## Backend Changes

### Database Migration

```sql
-- New brands table
CREATE TABLE brands (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  config_json TEXT NOT NULL,           -- serialized BrandManifest
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Add brand_id to games
ALTER TABLE games ADD COLUMN brand_id TEXT NOT NULL DEFAULT 'slopcade'
  REFERENCES brands(id);

-- Add brand_id to content-related tables as needed
-- (themes, any future user tables that are brand-scoped)

-- Index for brand-filtered queries
CREATE INDEX idx_games_brand_browse ON games(brand_id, status, updated_at DESC);

-- Seed brands
INSERT INTO brands (id, slug, display_name, config_json, status) VALUES
  ('slopcade', 'slopcade', 'Slopcade', '{}', 'active'),
  ('christian-party', 'faithfrenzy', 'FaithFrenzy Party', '{}', 'active');
```

### tRPC Context

```typescript
// api/src/trpc/context.ts — extend to include brandId
interface Context {
  // ...existing fields
  brandId: BrandId    // resolved from header, defaulting to 'slopcade'
}
```

### Content Loading

```typescript
// api/src/party/content/prompt-loader.ts — extend to be brand-aware
// Resolution order:
// 1. Look for brand-specific pack: "christian-party:trivia"
// 2. Fall back to default pack: "trivia" (only if explicitly allowed)
// 3. Error if no pack found
```

### API Routing

All game listing/search endpoints add `WHERE brand_id = ?` filter via `ctx.brandId`. Write endpoints automatically set `brand_id = ctx.brandId`.

---

## Frontend Changes

### App Config (`app/app.config.ts`)

```typescript
const BRAND_ID = process.env.BRAND_ID || 'slopcade'
const brand = getBrandManifest(BRAND_ID)

export default ({ config }) => ({
  ...config,
  name: brand.displayName,
  slug: brand.slug,
  scheme: brand.scheme,
  ios: { ...config.ios, bundleIdentifier: brand.ios.bundleIdentifier },
  android: { ...config.android, package: brand.android.package },
  icon: `./assets/brands/${brand.id}/icon.png`,
  splash: { image: `./assets/brands/${brand.id}/splash.png`, ... },
  extra: { ...config.extra, brandId: brand.id, brandTheme: brand.theme },
})
```

### EAS Build Profiles (`app/eas.json`)

```json
{
  "build": {
    "development": { "env": { "BRAND_ID": "slopcade" } },
    "christianparty-development": { "env": { "BRAND_ID": "christian-party" } },
    "christianparty-preview": { "env": { "BRAND_ID": "christian-party" } },
    "christianparty-production": {
      "distribution": "store",
      "env": { "BRAND_ID": "christian-party" }
    }
  },
  "submit": {
    "christianparty": {
      "ios": { "ascAppId": "<TBD>" },
      "android": { "track": "production" }
    }
  }
}
```

### Brand Bootstrap (`app/lib/brand/`)

```typescript
// getActiveBrand.ts
import Constants from 'expo-constants'
import { getBrandManifest } from '@slopcade/brands'

export const activeBrand = getBrandManifest(
  Constants.expoConfig?.extra?.brandId ?? 'slopcade'
)
```

### Theme Application

Override CSS variables in `global.css` dynamically based on brand manifest theme tokens. The existing NativeWind token system already supports this path via `packages/theme/src/tokens.ts`.

### Network Layer

Add brand header in a single place:

```typescript
// app/lib/trpc.ts — add to httpBatchLink headers
headers: () => ({
  'x-slopcade-brand': activeBrand.id,
})
```

### Isolation

- Remove all hardcoded "Slopcade" strings from UI — source from `activeBrand.displayName`
- Brand-specific Terms/Privacy URLs from manifest
- No cross-brand links or references

---

## Content Generation Plan

### Sources to Ingest

| Source | What We Get | Format | Adapter Priority |
|--------|------------|--------|-----------------|
| API.Bible (ABS) | Scripture text, 2500+ translations | REST/JSON | HIGH |
| BibleQuizzle (GitHub) | Pre-made trivia with scripture refs | JSON | HIGH |
| Theographic Bible Metadata | People, places, relationships graph | CSV/Cypher | HIGH |
| BradyStephenson Bible Data | Every person in the Bible | JSON | HIGH |
| Church Calendar API (calapi) | Liturgical calendar, feast days | REST/JSON | MEDIUM |
| CatholicSaints.Info | 17,000+ saint profiles | Scrape/API | MEDIUM |
| Bible Trivia Alpaca (HuggingFace) | 1.29k instruction-tuned trivia | Dataset | MEDIUM |
| OpenBible Geocoding | Bible place coordinates | CSV | LOW |
| Bible Cross-References | 340k+ verse links | CSV | LOW |

### Generation Targets (Launch Minimum)

| Content Type | Target Count | Used By Games |
|-------------|-------------|---------------|
| Bible trivia (MCQ) | 4,000 | quickfire-qa |
| Fill-in-blank prompts (Christian) | 3,000 | quiplash, crowd-comedy, punchline-duel, open-mic-frenzy |
| Fibbage-style Bible facts | 1,500 | truth-trap |
| Biblical history events + years | 700 | year-jinx |
| Drawing prompts (Bible scenes) | 1,000 | drawful-animate, sketch-bluff |
| Ranking/poll categories (Bible) | 800 | consensus-mine |
| Split-the-room moral dilemmas | 500 | half-and-half |
| Faith testimony prompts | 300 | about-you-bluff |
| Bible character traits | 200 | role-replay |
| Bible guessing categories | 500 | headsUp |
| **TOTAL** | **~12,500** | |

### Generation Pipeline Extension

Add to `packages/content-pipeline/src/generate/prompts.ts`:

```typescript
// Brand-aware prompt configs
const CHRISTIAN_SYSTEM_PREFIX = `You are generating content for a family-friendly Christian party game. 
All content must be:
- Respectful of Christian faith and traditions
- Suitable for church groups, youth groups, and family game nights
- Grounded in Biblical accuracy (include scripture references where applicable)
- Ecumenical (welcoming to all Christian denominations)
- Fun and engaging, not preachy or lecture-like`

const CHRISTIAN_QUIP: GameTypeConfig = {
  schema: z.object({ items: z.array(QuipItemSchema.extend({ scriptureRef: z.string().optional() })) }),
  system: CHRISTIAN_SYSTEM_PREFIX + '\nGenerate fill-in-the-blank prompts about Bible stories, church life, faith experiences, and Christian culture.',
  promptTemplate: (count) => `Generate ${count} fill-in-the-blank prompts across categories: Bible stories, church life, prayer, saints, holidays, parables, miracles, Christian culture. Each should have a blank (use _____).`,
}

// Similar configs for: christian-trivia, christian-fibbage, christian-drawing, etc.
```

### Quality Pipeline

1. **Automated**: Profanity filter, duplicate detection, age suitability check
2. **Theological review**: AI-assisted check against common doctrinal errors (verify scripture references exist, flag denominationally contentious claims)
3. **Human QA**: Final pass by someone with theological knowledge (can be outsourced)

---

## Game Selection

### Tier 1 — Launch Games (8 games)

| Game | Why It Fits | Content Pack Needed |
|------|------------|-------------------|
| **Quiplash** | Core party game, fill-in-blank works great with Bible humor | christian:quip |
| **Quickfire Q&A** | Bible trivia is the #1 obvious fit | christian:trivia |
| **Truth Trap** | "Did you know?" Bible facts are perfect for Fibbage | christian:fibbage |
| **Year Jinx** | Biblical/church history timeline guessing | christian:history |
| **Consensus Mine** | "Rank these Bible characters by X" is great | christian:ranking-poll |
| **Half and Half** | Moral dilemmas are deeply on-brand | christian:quip |
| **Drawful Animate** | "Draw the parting of the Red Sea" — instant fun | christian:drawing |
| **Heads Up** | Bible character guessing — classic church game | christian:headsup |

### Tier 2 — Add If Time Allows (4 games)

| Game | Why |
|------|-----|
| **About You Bluff** | Faith testimony prompts |
| **Role Replay** | Play as Bible characters with secret traits |
| **Question Answer** | Open-ended Bible discussion |
| **Sketch Bluff** | Draw + bluff with Bible themes |

### Defer

| Game | Why |
|------|-----|
| Lexicon Ladder | Fake words don't fit Bible theme well |
| Chroma Clues | Color-based, not meaningfully themeable |
| Out of Context | Needs curated images, too complex for launch |
| Chain Reaction | Word association is thin for theming |

---

## Asset Requirements

### Brand Kit (Needed by Week 2)

- **Brand name**: Decision needed (candidates: "FaithFrenzy Party", "GoodNews Game Night", "Hosanna House Party", "Saintly Shenanigans", "JoyfulGather Games")
- **Color palette**: Warm golds, deep blues/purples (liturgical colors), white
- **Typography**: Friendly but respectful (not too playful, not too formal)
- **Icon**: Cross + game controller motif, or dove + party elements
- **Tagline**: e.g., "Game Night for the Faithful"

### App Store Assets

| Asset | Spec |
|-------|------|
| iOS App Icon | 1024x1024 |
| Android Adaptive Icon | 108x108dp foreground + background |
| Splash Screen | 1284x2778 (iPhone 14 Pro Max) |
| Store Screenshots | 6.5" and 5.5" iPhone, Android phone/tablet |
| Feature Graphic (Android) | 1024x500 |
| App Preview Video | 15-30s gameplay montage |

### In-Game Assets

- Category badges/icons for each game (Bible, Saints, Parables, etc.)
- Seasonal overlays (Lent purple, Easter gold, Advent blue)
- UI illustrations (Bible-era motifs, stained glass aesthetic elements)

---

## Timeline: Now to Easter 2026

### Week 1 (Feb 16-22) — Foundation

- [ ] Lock brand name and visual direction
- [ ] Create `packages/brands/` with types and manifest system
- [ ] Wire `BRAND_ID` into `app.config.ts`
- [ ] Draft and apply DB migration (brands table, brand_id columns)
- [ ] Set up content pipeline adapters for Bible APIs (API.Bible, BibleQuizzle)
- [ ] Begin AI generation of first 2,000 trivia questions

### Week 2 (Feb 23 - Mar 1) — Backend + First Build

- [ ] Complete tRPC context brand injection + router filtering
- [ ] Wire brand header in client network layer
- [ ] Create Christian brand theme tokens (colors, fonts)
- [ ] Create app icon, splash screen, store assets
- [ ] Add EAS build profiles for Christian brand
- [ ] First internal build of Christian app variant
- [ ] Continue content generation (target: 5,000 items total)

### Week 3 (Mar 2-8) — Content Depth + QA

- [ ] Complete content generation for all Tier 1 game packs (~10,000 items)
- [ ] Run automated moderation pipeline
- [ ] Begin theological QA review
- [ ] Wire content packs to Tier 1 games
- [ ] Test all 8 Tier 1 games with Christian content
- [ ] Submit app to App Store / Play Store review

### Week 4 (Mar 9-15) — Polish + Pilot

- [ ] Fix bugs from testing
- [ ] Complete theological QA pass
- [ ] Pilot test with 2-5 church/family groups
- [ ] Iterate on content quality based on pilot feedback
- [ ] Finalize store listing copy, screenshots, metadata
- [ ] Begin Tier 2 game content if capacity allows

### Week 5 (Mar 16-22) — Content Freeze + Marketing

- [ ] Content freeze for v1 core packs
- [ ] Finalize all store screenshots and preview video
- [ ] Set up marketing landing page
- [ ] Begin outreach to Christian influencers, youth pastors, church networks
- [ ] Set up social media presence for brand
- [ ] Release candidate build

### Week 6 (Mar 23-29) — Holy Week Prep

- [ ] Holy Week themed content pack (Passion, Last Supper, Resurrection)
- [ ] Easter-specific marketing assets
- [ ] Press/influencer/church partner kits distributed
- [ ] Production readiness checks (monitoring, error tracking, scaling)
- [ ] Final app store approval confirmation

### Week 7 (Mar 30 - Apr 5) — LAUNCH

- [ ] Staged rollout (soft launch early week)
- [ ] Holy Week live ops (daily featured games)
- [ ] **Easter Sunday (Apr 5): Full launch**
- [ ] Monitor KPIs + hotfix window
- [ ] Post-launch retrospective

---

## Parallel Execution Lanes

```
Lane A: Backend Tenancy        Lane B: Frontend/Assets      Lane C: Content Factory       Lane D: GTM
──────────────────────         ─────────────────────        ────────────────────          ──────────
W1: DB migration               W1: Brand manifest pkg       W1: API adapters + gen        W1: Brand name
W2: tRPC scoping               W2: Theme + assets           W2: Gen continues             W2: Store setup
W3: Content serving            W3: QA build                 W3: Bulk gen + moderate       W3: Store submit
W4: Bug fixes                  W4: Polish                   W4: Theology QA               W4: Pilot groups
W5: Monitoring                 W5: Screenshots              W5: Content freeze            W5: Marketing
W6: Prod readiness             W6: Final build              W6: Easter pack               W6: Press kits
W7: Launch ops                 W7: Launch                   W7: Live content              W7: Launch!
```

### Critical Path

```
Brand manifest contract → App config variant → Backend brand scoping → Content packs available → App review → Launch
```

### Hard Dependencies

1. Brand manifest types must be finalized before anything else can start (Day 1-2)
2. Content pack schema extensions must be done before bulk generation (Week 1)
3. Bundle IDs + final naming locked before store submission (Week 3)
4. `brand_id` enforcement working before external pilot (Week 4)

---

## Open Decisions Needed

1. **Brand name** — Pick from candidates or brainstorm more
2. **User accounts** — Shared across brands or brand-isolated? (Recommend: isolated for v1)
3. **Denomination scope** — Ecumenical Christianity or Catholic-specific? (Recommend: ecumenical with Catholic-friendly content)
4. **Monetization** — Same model as Slopcade or different? (Free with IAP? Paid app?)
5. **Content tone** — Reverent and educational? Or playful and irreverent-but-respectful? (Recommend: playful and fun, not preachy)
6. **Drawing prompts** — Should they allow free drawing of religious figures? (Sensitivity consideration)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| App Store rejection for "template app" | Medium | High | Ensure materially different UI tone, unique store metadata, distinct visual identity |
| Theological inaccuracy in generated content | Medium | High | Scripture ref validation, denomination-sensitive moderation, human QA |
| Timeline too aggressive for Easter | Medium | High | Focus on Tier 1 games only, defer Tier 2, MVP content counts |
| Content feels "preachy" and unfun | Medium | Medium | Playtest extensively, prioritize humor, avoid lecture-style prompts |
| Cross-brand data leakage | Low | High | Server-side brand enforcement, never trust client header alone |
