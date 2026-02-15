# Task 2: Citation Validation - Font Support Baseline

## 1. Expo (React Native) Support Claims

### Claim: OTF and TTF are the only universally supported formats.
- **Evidence**: [Expo Fonts Guide](https://docs.expo.dev/develop/user-interface/fonts/#supported-font-formats)
- **Quote**: "Expo SDK officially supports OTF and TTF font formats across Android, iOS and web platforms."
- **Practical Implication**: Avoid WOFF/WOFF2 for Android native builds unless using a custom Metro configuration.

### Claim: Variable fonts lack universal platform support in Expo.
- **Evidence**: [Expo Fonts Guide - Variable Fonts](https://docs.expo.dev/develop/user-interface/fonts/#variable-fonts)
- **Quote**: "Variable fonts... do not have support across all platforms. For full platform support, use static fonts."
- **Practical Implication**: For the Slopcade UI, we should stick to static font files to ensure consistency between iOS and Android.

### Claim: Google Fonts integration is optimized via specialized packages.
- **Evidence**: [Expo Google Fonts Repo](https://github.com/expo/google-fonts)
- **Practical Implication**: Use `@expo-google-fonts/<family>` for rapid prototyping, but consider embedding via config plugin for production performance.

## 2. Godot 4.x Support Claims

### Claim: Godot 4 supports a wide range of dynamic font formats.
- **Evidence**: [Godot FontFile Documentation](https://docs.godotengine.org/en/stable/classes/class_fontfile.html)
- **Formats**: TTF, TTC, OTF, OTC, WOFF, WOFF2, Type 1.
- **Practical Implication**: Godot is more flexible than Expo regarding web-native formats (WOFF2).

### Claim: Variable fonts are supported via FontVariation.
- **Evidence**: [Godot FontVariation Documentation](https://docs.godotengine.org/en/stable/classes/class_fontvariation.html)
- **Practical Implication**: We can use variable fonts in the game engine even if we use static fonts in the React Native UI.

### Claim: Complex text shaping is handled by TextServerAdvanced.
- **Evidence**: [Godot TextServerAdvanced Documentation](https://docs.godotengine.org/en/stable/classes/class_textserveradvanced.html)
- **Features**: BiDi, HarfBuzz, ICU, SIL Graphite.
- **Practical Implication**: Authoritative support for RTL (Arabic/Hebrew) and complex scripts (Devanagari) is built-in.

## 3. Feature Matrix Dimensions (Finalized)
1. **Google Fonts Coverage**: Native package support (Expo) vs. Manual asset management (Godot).
2. **Variable Fonts**: Axis control availability and platform consistency.
3. **Runtime Loading**: Hook-based (Expo) vs. Resource-based (Godot).
4. **Fallbacks**: System-level vs. Resource-level configuration.
5. **Shaping/Complex Scripts**: OS-delegate (Expo) vs. Engine-integrated (Godot).
6. **Platform Caveats**: CORS (Web), Asset bundling (Native), and Port 8085 implications.
