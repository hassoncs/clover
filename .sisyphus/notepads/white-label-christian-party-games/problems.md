
## 2026-02-16 — Remaining Blocked Tasks (56 items)

All remaining tasks require human intervention. Categorized by blocker type:

### EXTERNAL ACCOUNTS (need dashboard access)
- Create Supabase project for amen.games
- Register App Store Connect + Google Play Console listing
- Set up social media accounts (@amengames)
- Create Stripe products in dashboard (3 church tiers + 2 individual)

### CONTENT GENERATION (need API keys + budget)
- AI generation: 2,000 trivia, 1,000 quips, 500 drawing, 500 fibbage, 300 history
- Run: `hush run -- pnpm content cli -- generate --game-type=amen-trivia --count=500`
- Ingest Theographic Bible data
- Automated moderation pipeline run
- AI theological review pass

### DESIGN ASSETS (need design tools or AI generation)
- App icon and splash screen (can use Scenario.com)
- Store screenshots and preview video
- Press/influencer kit assets

### HUMAN QA & TESTING
- Human QA review of all generated content
- Pilot test with 3-5 church groups
- End-to-end game testing with real content
- Performance testing with concurrent sessions

### MARKETING & OUTREACH
- Youth pastor influencer identification
- Church network outreach
- Social media campaigns
- Christian blogger/podcaster outreach

### STORE & LAUNCH OPS
- First internal build: `eas build --profile amen-preview`
- App Store / Play Store submission
- Launch day monitoring
- Hotfix window
- Post-launch metrics tracking

### PRIORITY ORDER FOR HUMAN ACTION
1. Create Supabase project (unblocks auth)
2. Create Stripe products (unblocks billing)
3. Generate app icon with Scenario.com
4. Run `eas build --profile amen-preview` (first build)
5. Run content generation pipeline
6. Register store listings
