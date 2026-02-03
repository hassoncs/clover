# Frontend Redesign: "Slop" Aesthetic & Navigation Restructure

## Context

### Original Request
Redesign the app frontend to remove the tab bar, establish "Big Browse" as the main home, hide the "Lab" tab (dev-only), and apply a "weird/sharp/slime" aesthetic with dark backgrounds and neon pops.

### Interview Summary
**Key Decisions**:
- **Navigation**: Remove visible tab bar. Keep `(tabs)` routing structure but hide UI.
- **Lab Access**: Long-press on App Logo in the new Browse Header (hidden feature).
- **Maker Access**: New "Create" icon button in the Browse Header.
- **Testing**: Manual verification only (exhaustive UI checks).
- **Aesthetic**: Dark (#111), Neon Green (#4CAF50), Orange/Pink accents. Sharp corners, "dripping" motifs.

### Metis Review
**Identified Gaps (Addressed)**:
- **Accessibility**: Long-press is hidden/dev-only. Maker icon must be accessible.
- **Navigation State**: Hiding tab bar UI preserves routing (`/lab`, `/maker`) without breaking deep links.
- **Scope Creep**: Explicitly excluding backend changes or auth flow rewrites.
- **Guardrails**: Minimum touch targets (44px), contrast checks for neon text.

---

## Work Objectives

### Core Objective
Restructure navigation to a "Big Browse" single-view feel and apply the "Slop" design language (sharp, slime, high-contrast) to key screens.

### Concrete Deliverables
- **Navigation**: Modified `_layout.tsx` to hide tab bar.
- **Browse Page**: Custom header (Logo + Icons), new "weird" game list layout.
- **Game Detail**: Hero-centric layout, sharp UI components.
- **Assets**: New `icon.png`, `splash.png`, and CSS slime overlays.
- **Theme**: Updated `src/theme.ts` with new tokens.

### Definition of Done
- [ ] App launches to Browse screen with NO tab bar visible.
- [ ] Long-press on Logo opens Lab.
- [ ] Header icon opens Maker.
- [ ] Game Detail page matches new design (hero image, sharp buttons).
- [ ] Splash screen and App Icon updated.
- [ ] All navigation flows (Back, Deep Link) function correctly.

### Must Have
- Dark theme baseline (#111 or similar).
- "Slop" aesthetic (sharp corners, border heavy).
- Functioning navigation to all previous screens (Lab, Maker, Detail).

### Must NOT Have (Guardrails)
- No changes to Godot game runtime.
- No changes to backend API.
- No new "Settings" screens (use existing or simple modal).
- No complex animations that block interaction (keep it snappy).

---

## Verification Strategy

**Type**: Manual QA Only (as requested).

### Verification Procedures

**1. Navigation & Header**
- [ ] Launch App → Verify Splash Screen appears.
- [ ] Land on Browse → Verify NO tab bar is visible.
- [ ] Tap "Maker" icon (Header) → Verifty navigates to `/maker`.
- [ ] Tap "Back" from Maker → Return to Browse.
- [ ] Long-press Logo (Header) → Verify navigates to `/lab`.

**2. Browse Page**
- [ ] Scroll feed → Verify performance/smoothness.
- [ ] Check "Cabinet Controls" icon → Verify menu/action works.
- [ ] Visual: Verify "slime" decorations are present but not blocking.

**3. Game Detail**
- [ ] Tap a game → Navigates to `/game-detail/[id]`.
- [ ] Verify Hero Image aspect ratio and sharpness.
- [ ] Tap "Play" → Launches game.
- [ ] Tap "Fork" → Triggers fork action.
- [ ] Visual: Verify sharp corners and neon accent colors.

---

## Task Flow

```
Phase 1 (Assets) → Phase 2 (Nav) → Phase 3 (Browse) → Phase 4 (Detail) → Phase 5 (Cleanup)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 1.1, 1.2 | Asset generation is independent |
| B | 3.1, 4.1 | Browse and Detail designs are independent |

---

## TODOs

### Phase 1: Assets & Theme

- [ ] 1.1 Generate "Slop" Assets
  **What to do**:
  - Generate `assets/slop-splash.png` (Dark, Gold Slime, "SLOP" text).
  - Generate `assets/slop-icon.png` (Matching style).
  - Create `assets/slime-overlay.png` (Decorative drips).
  - Update `app.json` to point to new splash/icon.
  **References**:
  - `app.json`: Icon/Splash config.
  - `bg_b70586a4`: Expo splash specs (1024x1024).

- [ ] 1.2 Update Theme Tokens
  **What to do**:
  - Update `src/theme.ts` with new "Slop" palette.
  - Add `sharp` radius token (0px or 2px).
  - Add `neon-orange` and `neon-pink` colors.
  - **Manual Verification**: Check any existing screen to see color shift.
  **References**:
  - `src/theme.ts`: Current definitions.

### Phase 2: Navigation Structure

- [ ] 2.1 Hide Tab Bar UI
  **What to do**:
  - Modify `app/app/(tabs)/_layout.tsx`.
  - Set `tabBarStyle: { display: 'none' }` (or remove styles and return `null` for tabBar).
  - Ensure routing structure remains for `/browse`, `/maker`, `/lab`.
  **Manual Verification**:
  - Run app, verify no bottom bar.
  - Verify routing still works via deep link or manual typing (if web).

### Phase 3: "Big Browse" Redesign

- [ ] 3.1 Implement Custom Header
  **What to do**:
  - Create `components/SlopHeader.tsx`.
  - Include: Logo (Left), Maker Icon (Right), Cabinet Menu (Right).
  - **Interaction**: Add `onLongPress` gesture to Logo -> `router.push('/lab')`.
  - **Interaction**: Add `onPress` to Maker Icon -> `router.push('/maker')`.
  **References**:
  - `app/app/(tabs)/browse.tsx`: Current header implementation.

- [ ] 3.2 Redesign Browse Layout
  **What to do**:
  - Update `app/app/(tabs)/browse.tsx`.
  - Remove standard header, integrate `SlopHeader`.
  - Update game list items to use "sharp" cards.
  - Add "CSS Slime" decorative images (absolute positioned).
  **Manual Verification**:
  - Check scrolling, tap targets, and visual style.

### Phase 4: Game Detail Redesign

- [ ] 4.1 Redesign Game Detail Screen
  **What to do**:
  - Update `app/app/game-detail/[id].tsx`.
  - **Hero**: Full width/large top image with "hard" border.
  - **Actions**: Large "Play" button (Orange/Pink gradient or solid).
  - **Info**: Horizontal rail of sharp "chips" for metadata.
  - **Style**: Remove `rounded-xl`, use `rounded-none` or `rounded-sm`.
  **References**:
  - `app/app/game-detail/[id].tsx`: Existing layout.
  - `src/theme.ts`: Use new sharp tokens.

### Phase 5: Cleanup & Polish

- [ ] 5.1 cleanup Lab Tab
  **What to do**:
  - Ensure `lab.tsx` is still routable but not visible in any UI list.
  - Verify `(tabs)/_layout.tsx` still includes the route.
  - (Optional) Add "Developer Mode" toast when accessing Lab.

---

## Success Criteria Checklist
- [ ] Tab Bar is GONE.
- [ ] App looks "weird" (in a good way) - sharp, dark, neon.
- [ ] Can navigate to Maker (Header).
- [ ] Can navigate to Lab (Long-press).
- [ ] Can play a game (Detail -> Play).
