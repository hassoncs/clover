# Font Rendering Capability Inventory

**Audit Date**: 2026-02-15
**Scope**: Godot layer + React Native/Expo layer

---

## Executive Summary

The codebase has **partial** font rendering capabilities with a clear split between Godot (game engine) and React Native (UI overlay) layers. Godot has a sophisticated font loading system with MSDF support, while React Native uses system fonts only.

---

## Capability Inventory Table

| Capability | Godot Layer | React Native Layer | Evidence |
|------------|-------------|-------------------|----------|
| **System Font Rendering** | YES | YES | Godot: `ThemeDB.fallback_font` (TextEffectSystem.gd:83); RN: `fontFamily` prop (OverlayRenderer.tsx:218) |
| **Dynamic TTF Loading (URL)** | YES | NO | TextEffectSystem.gd:79-114 implements `_load_font()` with HTTP download |
| **Font Caching** | YES | NO | TextEffectSystem.gd:5, 85-94 implements `_font_cache` Dictionary |
| **Font Persistence** | YES | NO | TextEffectSystem.gd:88-94 saves to `user://fonts/{md5}.ttf` |
| **MSDF Font Support** | YES | NO | TextEffectSystem.gd:40-42 sets `multichannel_signed_distance_field` |
| **Google Fonts Integration** | YES (via URL) | NO | font_test.tsx:12-14 defines Google Fonts URLs |
| **Font Family Selection** | PARTIAL | PARTIAL | Godot: URL-based only; RN: `fontFamily` string (OverlayRenderer.tsx:218) |
| **Font Size Control** | YES | YES | Godot: VisualRenderer.gd:710; RN: OverlayRenderer.tsx:215 |
| **Font Weight Control** | NO | YES | RN: OverlayRenderer.tsx:217 supports `fontWeight` |
| **Text Effects (Outline/Shadow/Glow)** | YES | PARTIAL | TextEffectSystem.gd:139-158 (MSDF effects); RN: textShadow only (OverlayRenderer.tsx:220-222) |
| **Device Tier Adaptation** | YES | YES | types.ts:120-145 `getMobileEffectLimits()`; text_effects_lab.tsx:29 |
| **Font Presets** | NO | PARTIAL | overlay.ts:32 defines `FontPreset` type but not implemented |
| **Bundled Fonts** | YES (gdUnit4 only) | NO | RobotoMono variants in `godot_project/addons/gdUnit4/src/update/assets/fonts/` |
| **expo-font Integration** | N/A | NO | expo-font in Podfile.lock but no `useFonts` calls found in app code |

---

## Detailed Findings

### Godot Layer

#### Font Loading Pipeline
**File**: `godot_project/scripts/effects/TextEffectSystem.gd`

The Godot layer has a complete font loading system:

1. **URL-based Loading** (lines 79-114):
   - Downloads TTF files via HTTPRequest
   - Caches to `user://fonts/{md5_hash}.ttf`
   - Falls back to `ThemeDB.fallback_font` on failure

2. **In-Memory Cache** (line 5):
   - `_font_cache: Dictionary` prevents re-downloading

3. **MSDF Support** (lines 40-42):
   ```gdscript
   font.multichannel_signed_distance_field = true
   font.msdf_pixel_range = font_config.get("msdfPixelRange", 16)
   ```

#### Text Rendering
**File**: `godot_project/scripts/bridge/VisualRenderer.gd`

- Basic text sprites use `Label.new()` (line 707)
- Font size scaled by PPM (line 710)
- No custom font loading in basic text path

#### Debug Overlay
**File**: `godot_project/scripts/debug/DebugOverlay.gd`

- Uses `ThemeDB.fallback_font` for debug labels (lines 239, 308)
- No custom font support for debug text

### React Native Layer

#### Overlay Renderer
**File**: `app/lib/game-engine/ui/overlay/OverlayRenderer.tsx`

- Uses React Native `<Text>` component (line 212)
- Supports `fontFamily` prop (line 218) but **no font loading**
- Supports `fontWeight` (line 217)
- Text shadow via RN built-in (lines 220-222)

#### Font Types
**File**: `shared/src/types/overlay.ts`

- Defines `FontPreset` type (line 32): `'system' | 'pixel' | 'retro' | 'handwritten' | 'monospace'`
- Defines `OverlayTheme.fontFamily`, `fontUrl`, `fontPreset` (lines 35-37)
- **Not implemented** - these are type definitions only

#### Example Files
**Files**: `app/app/examples/font_test.tsx`, `app/app/examples/text_effects_lab.tsx`

- Both use Google Fonts URLs passed to Godot
- No React Native font loading
- Font selection UI controls Godot rendering only

### Shared Types

#### Text Effects System
**File**: `shared/src/effects/text/types.ts`

- `FontConfig` interface (lines 13-19):
  - `source: 'system' | 'url' | 'google'`
  - `family`, `url`, `googleFont`, `weight` fields
- `TextConfig` with `fontSize`, `color`, `alignment` (lines 21-28)
- Device tier detection (lines 147-159)

#### Shader Registry
**File**: `shared/src/effects/text/registry.ts`

- MSDF text generator schema (lines 24-109)
- Effect parameters: outline, shadow, glow
- No font loading logic (shader params only)

---

## Gap Analysis

### Critical Gaps

1. **React Native Font Loading**: No `expo-font` usage despite being installed
   - Evidence: Grep for `useFonts|Font.loadAsync` returns only Podfile.lock entries

2. **Font Preset Implementation**: `FontPreset` type defined but not mapped to actual fonts
   - Evidence: `overlay.ts:32` defines type, no implementation found

3. **Font Weight in Godot**: No support for font weight variants
   - Evidence: `FontConfig.weight` exists in types but not used in TextEffectSystem.gd

### Partial Implementations

1. **Google Fonts**: Works via URL but no abstraction layer
   - Evidence: Raw URLs in font_test.tsx:12-14

2. **Font Family Selection**: String-based, no validation
   - Evidence: `fontFamily?: string` in types, no font registry

---

## Font Files in Repository

| Location | Count | Purpose |
|----------|-------|---------|
| `godot_project/addons/gdUnit4/src/update/assets/fonts/` | 14 | gdUnit4 test framework (RobotoMono) |
| App bundle | 0 | No bundled fonts for game use |

---

## Recommendations

1. **Implement expo-font for React Native UI** - Already installed, just needs integration
2. **Create font preset registry** - Map `FontPreset` values to actual font URLs/files
3. **Add font weight support to Godot** - Extend `FontConfig` handling
4. **Bundle game fonts** - Include pixel/retro fonts for offline support

---

## Evidence References

| Ref | File | Lines | Description |
|-----|------|-------|-------------|
| E1 | `godot_project/scripts/effects/TextEffectSystem.gd` | 79-114 | Font download and caching |
| E2 | `godot_project/scripts/effects/TextEffectSystem.gd` | 40-42 | MSDF configuration |
| E3 | `godot_project/scripts/bridge/VisualRenderer.gd` | 706-717 | Basic text sprite rendering |
| E4 | `app/lib/game-engine/ui/overlay/OverlayRenderer.tsx` | 198-233 | React Native text element |
| E5 | `shared/src/types/overlay.ts` | 32-44 | Font type definitions |
| E6 | `shared/src/effects/text/types.ts` | 13-28 | FontConfig and TextConfig |
| E7 | `app/app/examples/font_test.tsx` | 12-21 | Google Fonts URL usage |
| E8 | `app/ios/Podfile.lock` | 3129, 3268 | expo-font installed but unused |
