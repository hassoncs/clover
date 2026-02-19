# Amen — Jackbox-Style UI Overhaul Plan

**Goal**: Transform the Amen app from functional party game platform into a polished, Jackbox-quality experience per the UI brief. Covers browse → join → play → results → podium.

**Priority Order**: Game Selection redesign → Join/Host polish → Results overhaul → Settings

---

## Background

### ✅ Already Exists & Works
- All 8 games have server runners + client phase renderers
- Design system: Navy/Gold/Cream, Lora/Inter, rich Amen component library (SectionOrnament, MotifDivider, HaloBadge, GlowIcon, SparkleWrapper, AmenGrainOverlay, PatternBackground, biblical icons)
- Multiplayer: Durable Object rooms, WebSocket sync, host/player/audience roles
- Asset pipeline: Scenario.com + silhouette system + theme planner + hero title gen + R2 storage
- Audio: ElevenLabs TTS/SFX, Scenario music, AudioManager, phase-based music, Amen Host voice preset
- SFX: player-join, submit, correct, wrong, reveal, drumroll, winner-fanfare, crowd reactions (all in `audio-sfx-prompts.ts`)
- Announcer lines: lobby, rounds, voting, reveal, scores, winner, timer (all in `audio-announcer-lines.ts`)
- Phase music: all phases mapped per-game in `audio-phase-music.ts`
- Boot/splash screen: `AnimatedSplashScreen` + `AmenSplashSequence` already wired in `_layout.tsx`
- Room codes: 4-char alphanumeric stays as-is (more combinations)

### ❌ What's Missing
- Game Selection: flat emoji grid → horizontal carousel with art + detail panel + PLAY/HOW TO PLAY/PREVIEW
- How to Play: no per-game tutorial system
- Per-Game Settings: no pre-start config (rounds, difficulty, content pack, timer)
- Avatar System: no avatar picker at join, no avatar display in lobby/scores
- Results/Scoring: basic scoreboard → reveal animations, vote tallies, narrator voiceover, podium
- Settings/Options: no volume/captions/font-size/denomination screen
- Template Schema: missing tagline, format_tag, session_length, content_note, thumbnail_url, hero_image_url, how_to_play_steps
- Assets: 8 game tile illustrations, 8 hero banners, 8 title treatments, avatar icon images, ~32 tutorial panels

---

## Wave 0 — Foundation

- [x] **W0.1** · Template Metadata Schema Extension `[M]`

  Add columns to `party_game_templates`: `tagline`, `format_tag`, `session_length`, `content_note`, `thumbnail_url`, `hero_image_url`, `how_to_play_steps` (JSON: `[{ step, title, body, panelImageUrl }]`). Seed tagline/format_tag/session_length/content_note for all 13 games. Write how_to_play_steps JSON for all 8 primary games (3–5 steps each).

  **Files**:
  - CREATE `api/migrations/20260219_party_templates_ux_fields.sql`
  - MODIFY `api/src/trpc/routes/party-templates.ts` — return new fields in listByBrand/getById
  - MODIFY `apps/amen/hooks/useBrowsePartyGames.ts` — type update

---

## Wave 1 — Game Selection "The Hall"

- [x] **W1.4** · Template Types + Hook Update `[S]`

  Strong typing for new metadata fields throughout the frontend.

  **Files**:
  - CREATE `apps/amen/lib/party/template-types.ts` — `PartyTemplate` interface with all fields
  - MODIFY `apps/amen/hooks/useBrowsePartyGames.ts` — return typed data

- [x] **W1.1** · Hall Screen Layout + Horizontal Carousel `[L]`

  Complete redesign of browse.tsx into "The Hall":
  - Amen wordmark top-center (gold on navy)
  - Horizontal scrollable game tiles with illustrated icons (thumbnail_url or emoji fallback)
  - Selected tile scales up, gilded border glow
  - Detail panel below carousel

  **Files**:
  - MODIFY `apps/amen/app/(tabs)/browse.tsx` — replace entire screen
  - CREATE `apps/amen/components/browse/GameHallCarousel.tsx` — horizontal FlatList with snap-to-center
  - CREATE `apps/amen/components/browse/GameHallTile.tsx` — tile with art, name, glow border
  - Use: `GlowIcon`, `HaloBadge`, `AmenGrainOverlay` from `packages/ui/src/amen/`

- [x] **W1.2** · Selected Game Detail Panel `[M]`

  Info panel below carousel for selected game:
  - Game name (large), format tag, tagline
  - Player count, session length, content note
  - Three CTA buttons: PLAY (gold, primary), HOW TO PLAY (secondary), PREVIEW (secondary)

  **Files**:
  - CREATE `apps/amen/components/browse/GameDetailPanel.tsx`
  - CREATE `apps/amen/components/browse/GameMetaBadge.tsx` — player count/time/format pills
  - MODIFY `apps/amen/app/(tabs)/browse.tsx` — wire panel to selected tile state

- [ ] **W1.3** · How to Play Tutorial Screen `[L]`

  Per-game illustrated walkthrough from "The Hall":
  - Full-screen comic-panel style, 3–5 steps from `how_to_play_steps`
  - Image (panelImageUrl) + title + body per step
  - ElevenLabs voiceover narration per step (Amen Host voice)
  - "GOT IT" returns to browse

  **Files**:
  - CREATE `apps/amen/app/how-to-play/[templateId].tsx` — route
  - CREATE `apps/amen/components/browse/TutorialPager.tsx` — swipeable step cards
  - CREATE `apps/amen/components/browse/TutorialStep.tsx` — single step (image + text + audio)

- [ ] **W1.5** · Asset Generation — Game Tiles + Hero Banners + Tutorial Art `[XL]`

  Generate all visual assets for 8 primary games via existing Scenario.com pipeline:
  - 8 game tile illustrations (illuminated manuscript / stained glass style, ~512×512)
  - 8 hero banner images (wide format, ~1024×512)
  - 8 hero title text treatments (text-grid system + Scenario img2img)
  - 8 biblical avatar images (dove, lamb, flame, fish, star, scroll, cross, bread)
  - ~32 How to Play panels (~4 per game, comic-panel style)
  - 8 How to Play voiceover narrations (ElevenLabs, Amen Host voice, ~5 sentences each)
  - NOTE: Round reveal/score/celebration audio already exists — no generation needed there

  **Files**:
  - CREATE `api/src/party/assets/amen-game-art-prompts.ts` — prompt definitions per game
  - CREATE `api/src/party/assets/generate-amen-assets.ts` — orchestration script
  - MODIFY `api/src/trpc/routes/admin-tools.ts` — add admin trigger route
  - Store in R2, update `party_game_templates` rows with URLs

---

## Wave 2 — Join + Host Polish

- [x] **W2.1** · Avatar Picker at Join `[M]`

  Biblical avatar selection in join flow:
  - Grid of 8 avatar icons (dove, lamb, flame, fish, star, scroll, cross, bread)
  - Avatar sent with WebSocket connection params
  - Stored in player state, shown in lobby + scores

  **Files**:
  - CREATE `apps/amen/components/party/AvatarPicker.tsx` — grid of selectable icons
  - MODIFY `apps/amen/app/join.tsx` — add avatar step after name
  - MODIFY `api/src/party/PartyRoomDO.ts` — accept/store avatar in player data
  - MODIFY `api/src/party/protocol.ts` — add avatar to player state type

- [x] **W2.2** · Host Lobby UI Upgrade `[M]`

  Enhance host lobby:
  - Game name displayed prominently at top
  - Player tiles show avatar icon + name (not just initial)
  - Animated countdown on start ("Gathering the fellowship… 3… 2… 1…")
  - Settings button linking to per-game config sheet
  - Wire player-join SFX (already defined in SFX_PROMPTS)

  **Files**:
  - MODIFY `apps/amen/app/party/host.tsx`
  - CREATE `apps/amen/components/party/LobbyCountdown.tsx` — animated countdown overlay
  - CREATE `apps/amen/components/party/PlayerChip.tsx` — avatar + name tile

- [ ] **W2.3** · Per-Game Settings Sheet `[L]`

  Pre-start config sheet accessible from host lobby:
  - Number of rounds (3/5/7)
  - Content pack (Old Testament / New Testament / Full Bible / Advent & Lent)
  - Difficulty: Seeker (easy) / Disciple (medium) / Scholar (hard)
  - Timer: Standard 30s / Relaxed 60s / No timer
  - Audience voting toggle

  **Files**:
  - CREATE `apps/amen/components/party/GameSettingsSheet.tsx` — bottom sheet
  - MODIFY `api/src/party/PartyRoomDO.ts` — accept game_config on start_game
  - MODIFY `api/src/party/protocol.ts` — add game_config to start message
  - MODIFY `apps/amen/lib/party/PartyContext.tsx` — expose settings state + setter

---

## Wave 3 — Results & Scoring Overhaul

- [x] **W3.1** · Results Animation Component Kit `[L]`

  Reusable results components:
  - **AnswerRevealSequence**: answers revealed one-at-a-time with scroll/page-turn animation
  - **VoteTally**: animated bar/star count per answer
  - **RoundScoreBoard**: ranked list, gold laurel for top scorer, score deltas, flavor copy
  - **FinalPodium**: top 3 gold/silver/bronze borders, gold+cream confetti, "Well done, good and faithful servant!", Play Again + Back to Hall buttons, share card
  - Use existing: `winner-fanfare`, `reveal`, `drumroll`, `crowd-cheer` SFX; `reveal-drama` → `scores-celebration` → `winner-glory` music

  **Files**:
  - CREATE `apps/amen/components/party/results/AnswerRevealSequence.tsx`
  - CREATE `apps/amen/components/party/results/VoteTally.tsx`
  - CREATE `apps/amen/components/party/results/RoundScoreBoard.tsx`
  - CREATE `apps/amen/components/party/results/FinalPodium.tsx`
  - CREATE `apps/amen/components/party/results/ConfettiOverlay.tsx`
  - CREATE `apps/amen/components/party/results/ShareScoreCard.tsx`

- [x] **W3.4** · Narration Hook + Amen Podium Line `[M]`

  Wire narrator into results flow using existing infrastructure:
  - `usePartyNarration` hook triggers TTS for dynamic content (reads winning answers aloud)
  - Add Amen podium announcer line: "Well done, good and faithful servant!"
  - Results components trigger existing SFX at correct moments

  **Files**:
  - CREATE `apps/amen/lib/party/usePartyNarration.ts`
  - MODIFY `shared/src/constants/audio-announcer-lines.ts` — add Amen podium line

- [ ] **W3.2** · Wire Results into Text-Heavy Games `[L]`

  Integrate results components into 4 text-heavy primary games:
  - The Fellowship Table (quiplash)
  - The Mediator (half-and-half)
  - Scrolls of Truth (truth-trap)
  - Solomon's Bet (year-jinx)

  **Files**:
  - MODIFY `apps/amen/lib/party/defaultPhases.tsx` — update reveal/score phases
  - MODIFY relevant phase files as needed
  - MODIFY `apps/amen/app/party/play.tsx` — route to podium on game end

- [ ] **W3.3** · Wire Results into Remaining Games `[L]`

  Same treatment for other 4 primary games:
  - The Great Hall of Wisdom (quickfire-qa)
  - The Council (consensus-mine)
  - Illustrated Scripture (drawful-animate)
  - Who Am I? (heads-up)

  **Files**:
  - MODIFY `apps/amen/lib/party/quickfireQaPhases.tsx`
  - MODIFY `apps/amen/lib/party/consensusMinePhases.tsx`
  - MODIFY `apps/amen/lib/party/drawfulAnimatePhases.tsx`
  - MODIFY `apps/amen/lib/party/headsUpPhases.tsx`

---

## Wave 4 — Settings/Options

- [x] **W4.1** · App Settings Screen `[M]`

  Gear icon from browse screen opens settings:
  - Volume sliders (music / SFX / voice narration)
  - Captions/subtitles toggle
  - Font size: Small / Medium / Large (projector use)
  - Denomination mode: All Traditions / Protestant / Catholic / Orthodox
  - Content filters (skip denomination-specific questions)
  - Default round count, timer speed, audience mode toggle

  **Files**:
  - CREATE `apps/amen/app/settings/game-settings.tsx`
  - CREATE `apps/amen/components/settings/VolumeSlider.tsx`
  - CREATE `apps/amen/components/settings/DenominationPicker.tsx`
  - CREATE `apps/amen/lib/settings/useAppSettings.ts` — AsyncStorage-backed
  - MODIFY `apps/amen/app/(tabs)/browse.tsx` — add gear icon to header

- [x] **W4.2** · Settings Runtime Wiring `[M]`

  Apply saved settings to live gameplay:
  - Audio volumes → AudioManager
  - Font size → dynamic text scaling
  - Captions → subtitle overlay on narration
  - Timer speed → game server config

  **Files**:
  - MODIFY `apps/amen/lib/audio/AudioManager.ts` — respect volume settings
  - MODIFY `apps/amen/components/party/PartyGameRenderer.tsx` — text scale + captions
  - CREATE `apps/amen/components/party/CaptionOverlay.tsx`

---

## Dependency Graph

```
Wave 0
  W0.1 Schema ──────────────────────────────────┐
                                                 │
Wave 1 (The Hall)                                │
  W1.4 Types ←─────────────────────────────────-┘
  W1.1 Carousel ←── W1.4
  W1.2 Detail Panel ←── W1.4
  W1.3 How to Play ←── W1.4 (W1.5 needed for panel images)
  W1.5 Asset Gen (start early; URLs needed by W1.1/W1.2/W1.3)

Wave 2 (Join/Host) — parallel with Wave 1
  W2.1, W2.2, W2.3 all independent

Wave 3 (Results) — parallel with Waves 1 & 2
  W3.1 Component Kit
  W3.4 Narration ←── W3.1
  W3.2 Wire Text Games ←── W3.1, W3.4
  W3.3 Wire Other Games ←── W3.1, W3.4

Wave 4 (Settings) — fully independent
  W4.1 → W4.2
```

**Max parallelism**: After W0.1 completes, Waves 1, 2, 3 all run simultaneously. Wave 4 can start at any time.

---

## Totals

| Wave | Tasks | Complexity | Est. |
|------|-------|-----------|------|
| 0 | 1 | M | ~1h |
| 1 | 5 | S+M+L+L+XL | ~8h |
| 2 | 3 | M+M+L | ~4h |
| 3 | 4 | L+M+L+L | ~6h |
| 4 | 2 | M+M | ~3h |
| **Total** | **15** | | **~22h** |
