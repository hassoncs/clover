So, for the party test example, we should just either delete that or turn it into a real game. Same for the quick pull and quiplash. We need to move those out of examples and move them into like an actual like R2 game file. Can we do that? Is that possible to do? Or are we missing people? Pieces in terms of our game infrastructure that would be needed that the examples are using.# Font Rendering Support Audit Report

## 1. Executive Summary
This audit evaluates the current state of font rendering support across the Slopcade platform, specifically focusing on the Godot game engine and React Native (Expo) UI layers. 

**Key Finding**: The platform currently has a "split-brain" typography system. Godot possesses a robust, URL-based dynamic font loading and caching system with MSDF support. In contrast, the React Native layer is currently limited to system fonts, despite having the necessary infrastructure (`expo-font`) installed. This creates significant visual inconsistency between game-world text and UI overlays.

---

## 2. Support Matrix

| Feature | Godot (Game) | React Native (UI) | Web Export |
| :--- | :---: | :---: | :---: |
| **System Fonts** | ✅ | ✅ | ✅ |
| **Dynamic TTF/OTF (URL)** | ✅ | ❌ (Impl. Gap) | ✅ |
| **Google Fonts Integration** | ✅ (via URL) | ❌ (Impl. Gap) | ✅ |
| **Font Caching/Persistence** | ✅ | ❌ | ✅ (Browser) |
| **MSDF Rendering** | ✅ | ❌ | ✅ |
| **Variable Fonts** | ✅ | ⚠️ (Platform Limit) | ✅ |
| **WOFF/WOFF2 Support** | ✅ | ❌ (Platform Limit) | ✅ |
| **Text Effects (Outline/Glow)** | ✅ | ❌ (Partial) | ✅ |

---

## 3. Current State Analysis

### Godot Layer (Strong)
- **Dynamic Loading**: Implemented in `TextEffectSystem.gd`. Supports downloading TTF files from arbitrary URLs.
- **Caching**: Fonts are cached to `user://fonts/` using MD5 hashes of URLs to prevent redundant downloads.
- **Rendering**: Uses MSDF (Multi-channel Signed Distance Fields) for high-quality text scaling and effects (outline, shadow, glow).
- **Fallback**: Gracefully falls back to `ThemeDB.fallback_font` on load failure.

### React Native Layer (Weak)
- **Static Rendering**: Limited to system fonts (San Francisco/Roboto).
- **Infrastructure Gap**: `expo-font` is present in the project but not utilized in the `OverlayRenderer.tsx`.
- **Type Definitions**: `FontPreset` and `OverlayTheme` types exist in `shared/src/types/overlay.ts` but lack implementation logic.

---

## 4. Gap Analysis

We have identified **14 distinct gaps**, categorized as follows:

### High-Risk Implementation Gaps (Addressable)
1. **Unused `expo-font`**: The primary blocker for custom fonts in the UI layer.
2. **Unimplemented `FontPreset`**: The "pixel", "retro", and "handwritten" presets are currently dead APIs.
3. **Missing Bundled Fonts**: No fonts are bundled with the app, making the platform entirely dependent on network availability for custom typography.
4. **`fontFamily` Passthrough**: The UI layer accepts font family names but cannot resolve them to assets, leading to silent fallbacks.

### Platform Limits (Hard Constraints)
1. **Variable Font Support**: Expo/React Native lacks universal support for variable font axes across iOS and Android.
2. **WOFF2 on Native**: While Godot and Web support WOFF2, React Native native builds are limited to TTF/OTF.

---

## 5. Edge Cases & Risks

- **Race Conditions**: Godot text may "pop" from fallback to custom font after download, while RN text remains in the fallback font permanently.
- **Offline Play**: Without bundled fonts, games lose their visual identity when played without a connection.
- **CORS/Mixed Content**: Arbitrary font URLs may be blocked in web exports due to browser security policies.
- **Non-Latin Shaping**: While Godot's `TextServerAdvanced` supports complex scripts (Arabic, Thai, etc.), this remains untested in the current codebase.

---

## 6. Verdict
**Can we support arbitrary Google Fonts-rich rendering now?**

**Direct Answer**: **NO.** 
While the Godot layer is ready, the React Native UI layer is not. Any game using Google Fonts will currently show a jarring mismatch between the game world (custom font) and the UI overlay (system font).

**Confidence Level**: **High (95%)**
The technical infrastructure is 80% present, but the "last mile" integration in the React Native layer is missing.

---

## 7. Recommended Additions

| Priority | Task | Effort | Risk |
| :--- | :--- | :---: | :---: |
| **P0** | Implement `expo-font` loading in `OverlayRenderer` | S | Low |
| **P0** | Map `FontPreset` types to actual font assets | S | Low |
| **P1** | Bundle core "Slopcade" fonts (Pixel, Retro, Sans) | M | Low |
| **P1** | Add font weight support to Godot `TextEffectSystem` | S | Low |
| **P2** | Implement font fallback chains (e.g., "Bangers, Impact, sans-serif") | M | Med |
| **P2** | Add font loading state/indicators to `TextEffectSystem` | M | Low |

---

## 8. Caveats & Platform Notes
- **Metro Port 8085**: Ensure any new font assets are correctly resolved by the custom Metro configuration.
- **Memory Management**: Large CJK fonts (15MB+) should be handled with care to avoid OOM issues on lower-end mobile devices.
- **Legal**: Ensure all bundled or dynamically loaded fonts comply with their respective licenses (OFL, Apache, etc.).
